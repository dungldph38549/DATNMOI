import React,{useEffect,useState} from "react"
import { useParams } from "react-router-dom"
import { useDispatch } from "react-redux"
import { addToCart } from "../../redux/cartSlice"

const ProductDetail = ()=>{

const {id} = useParams()
const dispatch = useDispatch()

const [product,setProduct] = useState(null)

useEffect(()=>{

const fetchProduct = async()=>{

const res = await fetch(`http://localhost:3001/api/product/${id}`)
const data = await res.json()

setProduct(data.data)

}

fetchProduct()

},[id])

if(!product) return <p className="text-center mt-10">Loading...</p>

return(

<div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 gap-10">

<div className="bg-gray-100 p-10 rounded">

<img
src={`http://localhost:3001/uploads/${product.image}`}
className="w-full object-contain"
/>

</div>

<div>

<h1 className="text-3xl font-bold mb-4">
{product.name}
</h1>

<p className="text-red-500 text-2xl font-bold mb-4">
${product.price}
</p>

<p className="text-gray-600 mb-6">
{product.description}
</p>

<button
onClick={()=>dispatch(addToCart({
productId:product._id,
name:product.name,
image:product.image,
price:product.price,
qty:1
}))}
className="bg-black text-white px-10 py-3 rounded hover:bg-red-500"
>
Thêm vào giỏ hàng
</button>

</div>

</div>

)

}

export default ProductDetail