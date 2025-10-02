import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:4001/orders")
      .then(res => setOrders(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Danh sách Orders</h1>
      <ul>
        {orders.map(order => (
          <li key={order.id}>
            {order.item} - {order.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
