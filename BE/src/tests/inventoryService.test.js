// ================================================================
// tests/inventoryService.test.js
// Unit tests cho inventoryService
// npm install --save-dev jest @jest/globals mongodb-memory-server mongoose
// ================================================================
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Mock socket để không cần server thật
jest.mock("../socket/inventorySocket", () => ({
  emitStockUpdate: jest.fn(),
  emitSyncDone: jest.fn(),
}));
jest.mock("../jobs/alertJob", () => ({
  sendLowStockAlert: jest.fn(),
  scheduleLowStockScan: jest.fn(),
}));

const Inventory = require("../models/Inventory");
const svc = require("../services/inventoryService");

let mongod;

// ── Setup / Teardown ─────────────────────────────────────────
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Inventory.deleteMany({});
});

// ── Helpers ───────────────────────────────────────────────────
const makeInventory = (overrides = {}) =>
  Inventory.create({
    productId: new mongoose.Types.ObjectId(),
    sku: `SKU-${Date.now()}`,
    totalQuantity: 100,
    ...overrides,
  });

const fakeUser = new mongoose.Types.ObjectId();
const fakeWH = new mongoose.Types.ObjectId();
const fakeOrder = new mongoose.Types.ObjectId();

// ================================================================
// createInventory
// ================================================================
describe("createInventory", () => {
  it("tạo mới inventory thành công", async () => {
    const inv = await svc.createInventory({
      productId: new mongoose.Types.ObjectId(),
      sku: "SKU-001",
      lowStockThreshold: 5,
    });

    expect(inv.sku).toBe("SKU-001");
    expect(inv.totalQuantity).toBe(0);
    expect(inv.status).toBe("out_of_stock");
  });

  it("throw 409 khi SKU đã tồn tại", async () => {
    await makeInventory({ sku: "SKU-DUP" });

    await expect(
      svc.createInventory({
        productId: new mongoose.Types.ObjectId(),
        sku: "SKU-DUP",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ================================================================
// importStock
// ================================================================
describe("importStock", () => {
  it("nhập kho tăng totalQuantity", async () => {
    const inv = await makeInventory({ sku: "SKU-IMPORT", totalQuantity: 50 });
    const updated = await svc.importStock(
      inv._id.toString(),
      { qty: 30, warehouseId: fakeWH, note: "Test nhập" },
      fakeUser,
    );

    expect(updated.totalQuantity).toBe(80);
    expect(updated.status).toBe("in_stock");
  });

  it("lưu audit log khi nhập", async () => {
    const inv = await makeInventory({ sku: "SKU-LOG" });
    const updated = await svc.importStock(
      inv._id.toString(),
      { qty: 20, warehouseId: fakeWH },
      fakeUser,
    );

    const log = updated.auditLogs.at(-1);
    expect(log.type).toBe("import");
    expect(log.quantity).toBe(20);
    expect(log.afterQty).toBe(120);
  });

  it("cập nhật stock theo warehouse", async () => {
    const inv = await makeInventory({ sku: "SKU-WH" });
    const updated = await svc.importStock(
      inv._id.toString(),
      { qty: 10, warehouseId: fakeWH },
      fakeUser,
    );

    const wh = updated.warehouses.find(
      (w) => w.warehouseId.toString() === fakeWH.toString(),
    );
    expect(wh).toBeDefined();
    expect(wh.quantity).toBe(10);
  });

  it("throw 400 khi qty <= 0", async () => {
    const inv = await makeInventory({ sku: "SKU-NEG" });
    await expect(
      svc.importStock(
        inv._id.toString(),
        { qty: -5, warehouseId: fakeWH },
        fakeUser,
      ),
    ).rejects.toThrow();
  });
});

// ================================================================
// exportStock
// ================================================================
describe("exportStock", () => {
  it("xuất kho trừ totalQuantity", async () => {
    const inv = await makeInventory({ sku: "SKU-EXP", totalQuantity: 50 });
    const updated = await svc.exportStock(
      inv._id.toString(),
      { qty: 20, warehouseId: fakeWH, orderId: fakeOrder },
      fakeUser,
    );

    expect(updated.totalQuantity).toBe(30);
  });

  it("throw khi không đủ hàng", async () => {
    const inv = await makeInventory({ sku: "SKU-NOSTOCK", totalQuantity: 5 });
    await expect(
      svc.exportStock(
        inv._id.toString(),
        { qty: 10, warehouseId: fakeWH },
        fakeUser,
      ),
    ).rejects.toMatchObject({ message: expect.stringContaining("Không đủ") });
  });

  it("status chuyển sang out_of_stock khi hết hàng", async () => {
    const inv = await makeInventory({ sku: "SKU-EMPTY", totalQuantity: 5 });
    const updated = await svc.exportStock(
      inv._id.toString(),
      { qty: 5, warehouseId: fakeWH },
      fakeUser,
    );

    expect(updated.status).toBe("out_of_stock");
    expect(updated.available).toBe(0);
  });
});

// ================================================================
// reserveStock / releaseReserve
// ================================================================
describe("reserve & release", () => {
  it("reserve giảm available nhưng không giảm totalQuantity", async () => {
    const inv = await makeInventory({ sku: "SKU-RES", totalQuantity: 50 });
    const updated = await svc.reserveStock(
      inv._id.toString(),
      { qty: 10, orderId: fakeOrder },
      fakeUser,
    );

    expect(updated.totalQuantity).toBe(50);
    expect(updated.totalReserved).toBe(10);
    expect(updated.available).toBe(40);
  });

  it("throw khi reserve nhiều hơn available", async () => {
    const inv = await makeInventory({ sku: "SKU-OVERRES", totalQuantity: 5 });
    await expect(
      svc.reserveStock(
        inv._id.toString(),
        { qty: 10, orderId: fakeOrder },
        fakeUser,
      ),
    ).rejects.toMatchObject({ message: expect.stringContaining("Không đủ") });
  });

  it("release trả lại available", async () => {
    const inv = await makeInventory({ sku: "SKU-REL", totalQuantity: 50 });
    await svc.reserveStock(
      inv._id.toString(),
      { qty: 10, orderId: fakeOrder },
      fakeUser,
    );
    const updated = await svc.releaseReserve(
      inv._id.toString(),
      { qty: 10, orderId: fakeOrder },
      fakeUser,
    );

    expect(updated.totalReserved).toBe(0);
    expect(updated.available).toBe(50);
  });
});

// ================================================================
// adjustStock
// ================================================================
describe("adjustStock", () => {
  it("điều chỉnh về số lượng mới", async () => {
    const inv = await makeInventory({ sku: "SKU-ADJ", totalQuantity: 100 });
    const updated = await svc.adjustStock(
      inv._id.toString(),
      { newQty: 75, warehouseId: fakeWH, note: "Kiểm kho" },
      fakeUser,
    );

    expect(updated.totalQuantity).toBe(75);
  });

  it("lưu audit log type=adjust", async () => {
    const inv = await makeInventory({ sku: "SKU-ADJLOG", totalQuantity: 100 });
    const updated = await svc.adjustStock(
      inv._id.toString(),
      { newQty: 60, note: "Test" },
      fakeUser,
    );

    const log = updated.auditLogs.at(-1);
    expect(log.type).toBe("adjust");
    expect(log.beforeQty).toBe(100);
    expect(log.afterQty).toBe(60);
  });

  it("status chuyển sang low_stock khi dưới ngưỡng", async () => {
    const inv = await makeInventory({
      sku: "SKU-LOW",
      totalQuantity: 100,
      lowStockThreshold: 20,
    });
    const updated = await svc.adjustStock(
      inv._id.toString(),
      { newQty: 15 },
      fakeUser,
    );

    expect(updated.status).toBe("low_stock");
  });
});

// ================================================================
// getLowStock
// ================================================================
describe("getLowStock", () => {
  it("trả về đúng danh sách hàng sắp hết", async () => {
    await makeInventory({
      sku: "FULL",
      totalQuantity: 100,
      lowStockThreshold: 10,
    });
    await makeInventory({
      sku: "LOW",
      totalQuantity: 5,
      lowStockThreshold: 10,
      status: "low_stock",
    });
    await makeInventory({
      sku: "EMPTY",
      totalQuantity: 0,
      status: "out_of_stock",
    });

    const result = await svc.getLowStock();
    const skus = result.map((r) => r.sku);

    expect(skus).toContain("LOW");
    expect(skus).toContain("EMPTY");
    expect(skus).not.toContain("FULL");
  });
});

// ================================================================
// getAuditLogs — phân trang
// ================================================================
describe("getAuditLogs", () => {
  it("phân trang logs đúng", async () => {
    const inv = await makeInventory({ sku: "SKU-LOGS", totalQuantity: 0 });
    // Nhập 5 lần
    for (let i = 0; i < 5; i++) {
      await svc.importStock(
        inv._id.toString(),
        { qty: 10, warehouseId: fakeWH },
        fakeUser,
      );
    }

    const page1 = await svc.getAuditLogs(inv._id.toString(), {
      page: 1,
      limit: 3,
    });
    const page2 = await svc.getAuditLogs(inv._id.toString(), {
      page: 2,
      limit: 3,
    });

    expect(page1.items.length).toBe(3);
    expect(page1.meta.total).toBe(5);
    expect(page1.meta.pages).toBe(2);
    expect(page2.items.length).toBe(2);
  });

  it("filter theo type", async () => {
    const inv = await makeInventory({ sku: "SKU-FILTER", totalQuantity: 100 });
    await svc.importStock(
      inv._id.toString(),
      { qty: 10, warehouseId: fakeWH },
      fakeUser,
    );
    await svc.exportStock(
      inv._id.toString(),
      { qty: 5, warehouseId: fakeWH },
      fakeUser,
    );

    const imports = await svc.getAuditLogs(inv._id.toString(), {
      type: "import",
    });
    const exports = await svc.getAuditLogs(inv._id.toString(), {
      type: "export",
    });

    expect(imports.items.every((l) => l.type === "import")).toBe(true);
    expect(exports.items.every((l) => l.type === "export")).toBe(true);
  });
});
