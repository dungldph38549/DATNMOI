import React from "react"
import { useSelector,useDispatch } from "react-redux"
import { removeFromCart } from "../../redux/cartSlice"

const ShoppingCartPage = ()=>{

const cartItems = useSelector(state => state.cart.items)
const dispatch = useDispatch()

const total = cartItems.reduce((sum,item)=>sum + item.price * item.qty,0)

return(

<div className="max-w-6xl mx-auto px-6 py-10">

<h1 className="text-3xl font-bold mb-6">
Giỏ hàng
</h1>

{cartItems.length === 0 && <p>Chưa có sản phẩm</p>}

{cartItems.map(item=>(

<div key={item.productId} className="flex items-center border-b py-4">

<img
src={`http://localhost:3001/uploads/${item.image}`}
className="w-20 h-20 object-contain"
/>

<div className="flex-1 ml-4">

<h3>{item.name}</h3>
<p className="text-red-500">${item.price}</p>

</div>

<button
onClick={()=>dispatch(removeFromCart(item.productId))}
className="text-red-500"
>
Xóa
</button>

</div>

))}

<h2 className="text-xl font-bold mt-6">
Tổng: ${total}
</h2>

</div>

)

}

export default ShoppingCartPage