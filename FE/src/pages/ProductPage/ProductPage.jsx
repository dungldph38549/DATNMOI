import React,{useEffect,useState} from "react"
import Product from "../Product/Product"

const ProductPage = ()=>{

const [products,setProducts] = useState([])
const [search,setSearch] = useState("")

useEffect(()=>{

const fetchProducts = async()=>{

const res = await fetch("http://localhost:3001/api/product")
const data = await res.json()

setProducts(data.data)

}

fetchProducts()

},[])

const filterProducts = products.filter(p =>
p.name.toLowerCase().includes(search.toLowerCase())
)

return(

<div className="max-w-7xl mx-auto px-6 py-10">

<h1 className="text-3xl font-bold mb-6">
Tất cả sản phẩm
</h1>

<input
type="text"
placeholder="Tìm sản phẩm..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
className="border p-2 mb-6 w-full rounded"
/>

<div className="grid grid-cols-4 gap-6">

{filterProducts.map(p=>(
<Product key={p._id} product={p}/>
))}

</div>

</div>

)

}

export default ProductPage