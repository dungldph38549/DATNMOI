import React from "react";
import { Link } from "react-router-dom";

const Product = ({ product }) => {

return (

<div className="product-card border rounded p-3 text-center">

<Link to={`/product/${product._id}`}>

<img
src={`http://localhost:3001/uploads/${product.image}`}
alt={product.name}
className="img-fluid"
/>

<h5 className="mt-2">{product.name}</h5>

</Link>

<p className="text-danger fw-bold">
${product.price}
</p>

</div>

);

};

export default Product;