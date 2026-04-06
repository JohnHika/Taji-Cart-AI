import React from 'react'
import DisplayCartItem from '../components/DisplayCartItem'
import { useNavigate } from 'react-router-dom'

const CartMobile = () => {
  const navigate = useNavigate()

  return <DisplayCartItem close={() => navigate(-1)} />
}

export default CartMobile
