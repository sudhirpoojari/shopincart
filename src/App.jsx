import React, { useEffect, useState } from 'react'

import Header from './components/Header'

const API_BASE = 'http://localhost/php-cart/api'

const PLACEHOLDER = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial, Helvetica, sans-serif" font-size="20">No Image</text></svg>'

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({})
  const [checkoutStatus, setCheckoutStatus] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/products.php`)
      .then(r => r.json())
      .then(data => {
        if (data && data.products) setProducts(data.products)
      })
      .catch(err => console.error('fetch products error', err))
      .finally(() => setLoading(false))
  }, [])

  function addToCart(product) {
    setCart(prev => {
      const existing = prev[product.id] || { ...product, quantity: 0 }
      if (existing.quantity + 1 > product.stock) return prev // can't add more than stock
      return { ...prev, [product.id]: { ...existing, quantity: existing.quantity + 1 } }
    })
  }

  function decFromCart(productId) {
    setCart(prev => {
      const existing = prev[productId]
      if (!existing) return prev
      if (existing.quantity <= 1) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return { ...prev, [productId]: { ...existing, quantity: existing.quantity - 1 } }
    })
  }

  function totalAmount() {
    return Object.values(cart).reduce((s, it) => s + it.price * it.quantity, 0)
  }

  async function handleCheckout() {
    const items = Object.values(cart).map(i => ({ id: i.id, quantity: i.quantity, price: i.price }))
    if (items.length === 0) return alert('Cart is empty')

    // For demo, we'll ask a tiny customer object
    const customer = {
      name: prompt('Enter your name') || 'Guest',
      email: prompt('Enter your email (optional)') || '',
      phone: prompt('Enter phone (optional)') || ''
    }

    setCheckoutStatus('processing')

    try {
      const res = await fetch(`${API_BASE}/create_order.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer, items, payment_method: 'cod' })
      })
      const j = await res.json()
      if (!j.success) throw new Error(j.message || 'Order failed')

      // trigger notifications
      await fetch(`${API_BASE}/send_notifications_fixed.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: j.order_id, customer })
      })

      setCheckoutStatus({ success: true, order_id: j.order_id })
      setCart({})
      // refresh products to reflect inventory changes
      setLoading(true)
      fetch(`${API_BASE}/products.php`).then(r => r.json()).then(d => setProducts(d.products)).finally(() => setLoading(false))
    } catch (err) {
      console.error(err)
      setCheckoutStatus({ success: false, message: err.message })
    }
  }

  return (


    <div className="bg-amber-100" style={{ padding: 0, fontFamily: 'Arial, sans-serif' }}>
      <Header />
      <div className='flex bg-amber-100  text-blue-500 text-3xl align-items: center;'>Shoping Cart App</div>
      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div  style={{ display: 'flex', gap: 20 }}>
          <div style={{ flex: 2 }}>
            <h2>Products</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {products.map(p => (
                <div key={p.id} style={{ background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 160, overflow: 'hidden', borderRadius: 8 }}>
                    <img src={p.image || PLACEHOLDER} alt={p.name} style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} onError={(e)=>{e.target.src=PLACEHOLDER}} />
                  </div>
                  <div style={{ padding: '10px 6px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: 16 }}>{p.name}</strong>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>₹{p.price}</div>
                    </div>
                    <p style={{ margin: '6px 0', color: '#475569', fontSize: 13, flex: 1 }}>{p.description}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div>
                        {p.stock > 0 ? (
                          <span style={{ color: '#065f46', background: '#ecfdf5', padding: '4px 8px', borderRadius: 6, fontSize: 16 }}>In stock: {p.stock}</span>
                        ) : (
                          <span style={{ color: '#b91c1c', background: '#fff1f2', padding: '4px 8px', borderRadius: 6, fontSize: 16 }}>Out of stock</span>
                        )}
                      </div>
                      <div>
                        <button onClick={() => addToCart(p)} disabled={p.stock <= 0} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: p.stock > 0 ? 'pointer' : 'not-allowed' }}>Add</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <h1 className='rounded-2xl text-red-700 text-2xl '>Cart</h1>
            {Object.values(cart).length === 0 ? (
              <p>Cart empty</p>
            ) : (
              <div>
                {Object.values(cart).map(it => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #eee' }}>
                    <div>
                      <div><strong>{it.name}</strong></div>
                      <div>₹{it.price} x {it.quantity}</div>
                    </div>
                    <div className='flex gap-1'>
                      <button className='rounded-md text-amber-50 bg-indigo-800   px-2 py-1' onClick={() => decFromCart(it.id)}> - </button>
                  
                      <button className='rounded-md text-amber-50 bg-indigo-800  px-2 py-1' onClick={() => addToCart(it)} disabled={it.quantity >= (products.find(p => p.id === it.id)?.stock || 0)}>+</button>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 12 }}>
                  <div><strong>Total: ₹{totalAmount().toFixed(2)}</strong></div>
                  <div style={{ marginTop: 8 }}>
                    <button className="rounded-md text-amber-50 bg-indigo-600 px-3 py-2"  onClick={handleCheckout}>Checkout</button>
                  </div>
                </div>
              </div>
            )}

            {checkoutStatus && (
              <div style={{ marginTop: 12 }}>
                {checkoutStatus === 'processing' ? <div className='text-emerald-500 text-5xl font-semibold'>Processing order...</div> : (
                  checkoutStatus.success ? <div className='text-emerald-800 text-3xl font-semibold' >Order placed! ID: {checkoutStatus.order_id}</div> : <div style={{ color: 'red' }}>Error: {checkoutStatus.message}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
