import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
// import { getOrders, updateOrderStatus} from "../../services/order_Service";


export default function OrdersPage() {

  const [date, setDate] = useState(new Date());

  useEffect(() => {
    
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getOrders();
      console.log("API RESPONSE =", data);
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };
  const handleStatusUpdate = async (
    orderId,
    newStatus
  ) => {
    try {

      await updateOrderStatus(
        orderId,
        newStatus
      );

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                tracking_status: newStatus,
              }
            : order
        )
      );

    } catch (error) {
      console.error(error);
      alert("Status update failed");
    }
  };
  
  const [orders, setOrders] = useState([]);

  console.log("ORDERS =", orders);

  return (
    <div className="p-8 text-white">
    <div className="flex justify-between items-start">

      {/* Left Side */}
      <div className="flex-1 mr-6">

        <h1 className="text-[64px] font-bold leading-none">
          Orders
        </h1>

        <p className="text-gray-400 mt-2">
          today list
        </p>

        {/* Search */}
        <div className="relative w-full mt-8">

          <input
            placeholder="Order Id, COD, UPI"
            className="w-full h-12 rounded-lg border border-gray-600 bg-transparent pl-5 pr-12"
          />

          <Search
            size={22}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          />

        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 w-full">

          <div className="w-full  h-[82px] bg-sky-300 rounded-lg px-3 py-2">
            <p className="font-bold text-sky-700 text-xl">
              New Orders
            </p>
            <p className="text-5xl font-bold text-sky-700">
              18
            </p>
          </div>

          <div className="w-full h-[82px] bg-orange-200 rounded-lg px-3 py-2">
            <p className="font-bold text-orange-600 text-xl">
              Shipped
            </p>
            <p className="text-5xl font-bold text-orange-600">
              12
            </p>
          </div>

          <div className="w-full h-[82px] bg-green-200 rounded-lg px-3 py-2">
            <p className="font-bold text-green-600 text-xl">
              Delivered
            </p>
            <p className="text-5xl font-bold text-green-600">
              8
            </p>
          </div>

          <div className="w-full  h-[82px] bg-red-20 rounded-lg px-3 py-2">
            <p className="font-bold text-red-500 text-xl">
              Pending
            </p>
            <p className="text-5xl font-bold text-red-500">
              18
            </p>

           
          </div>

        </div>

      </div>

      {/* Calendar */}
      <div className="w-[260px] h-[260px]">

        <Calendar
          onChange={setDate}
          value={date}
          className="rounded-xl overflow-hidden border border-gray-700"
        />

      </div>
      
{/* card --oder details cutomer wise  */}
    </div>
    
      {orders.map((order) => (
        
      <div
        key={order.id}
        className="mt-8 pt-5 border-t border-gray-700"
      >
        <div className="flex justify-between items-center border-b border-gray-700 pb-5">

          <div>
            <span className="font-bold">{order.order_number}</span>
            <span className="ml-4">Date : {order.ordered_at?.split("T")[0]}</span>
          </div>

          <div className="flex items-center gap-2">

            <span className="text-xs text-gray-400 mr-2">
              Operation Action :
            </span>

            <button
              onClick={() =>
                handleStatusUpdate(
                  order.id,
                  "PROCESSING"
                )
              }
              className={`px-3 py-1 rounded text-xs ${
                order.tracking_status === "PROCESSING"
                  ? "bg-blue-500 text-white"
                  : "border"
              }`}
            >
              Process
            </button>

            <button
              onClick={() =>
                handleStatusUpdate(
                  order.id,
                  "SHIPPED"
                )
              }
              className={`px-3 py-1 rounded text-xs ${
                order.tracking_status === "SHIPPED"
                  ? "bg-orange-400 text-black"
                  : "border"
              }`}
            >
              Shipped
            </button>

            <button
              onClick={() =>
                handleStatusUpdate(
                  order.id,
                  "DELIVERED"
                )
              }
              className={`px-3 py-1 rounded text-xs ${
                order.tracking_status === "DELIVERED"
                  ? "bg-green-500 text-white"
                  : "border"
              }`}
            >
              Deliver
            </button>

          </div>

        </div>

        <div className="grid grid-cols-[1fr_1.4fr_280px] gap-8 mt-8">

  {/* Customer */}

        <div className="pr-8 border-r border-gray-700 flex flex-col justify-between">

          <h3 className="text-gray-400 text-2xl font-bold mb-4">
            Customer Registry
          </h3>

          <p className="text-4xl font-bold">
            {order.customer_name}
          </p>

          <p className="text-gray-500 underline text-sm">
            {order.customer_email}
          </p>

          <div className="mt-8 space-y-4 text-sm">

            <p>Address:</p>

            <p className="font-semibold ml-5">
              {order.address_line1}
            </p>

            <p className="font-semibold ml-5">
              {order.address_line2}
            </p>
            <p className="font-semibold ml-5">
              {order.city}
            </p>
            <p className="font-semibold ml-5">
              {order.pincode}
            </p>
          </div>

          <div className="mt-12 text-sm space-y-4">

            <p className="text-gray-400">
              Receipt Method :
              <span className="text-orange-400 ml-2 font-bold">
                {order.payment_method}
              </span>
            </p>

            <p className="mt-3">
              Dispatch logistics :
              <span className="font-bold ml-2">
                Priority Cargo
              </span>
            </p>

          </div>

        </div>

        {/* Purchased */}

        <div className="pr-8 border-r border-gray-700">

          <h3 className="text-gray-400 text-2xl font-bold mb-6">
            Purchased Item
          </h3>

          <div className="flex items-start gap-4 mb-6">

            <div className="w-12 h-12 border-2 border-gray-500 rounded overflow-hidden">
              <img
                src={order.product_image}
                alt="Product"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1">

              <p className="font-semibold text-lg">
                {order.product_name}
              </p>

              <p className="text-sm text-gray-400">
                Size : {order.size}
              </p>

              <p className="text-sm text-gray-400">
                Color : {order.color}
              </p>

              <p className="text-sm text-gray-400">
                Quantity : {order.quantity}
              </p>

            </div>

            <p className="font-semibold text-lg">
              ₹{order.price}
            </p>

          </div>

          {/* Price Breakdown */}

          <div className="border-t border-gray-700 pt-4 space-y-3">

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Product Price
              </span>
              <span>
                ₹{order.price}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Quantity
              </span>
              <span>
                {order.quantity}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Shipping
              </span>
              <span className="text-green-400">
                FREE
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Tax
              </span>
              <span>
                ₹0
              </span>
            </div>

            <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-lg">
              <span>
                Total
              </span>
              <span className="text-green-400">
                ₹{order.total_amount}
              </span>
            </div>
            
            <div className="border-t border-gray-700 ">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">
                  Delivery Days :
                </span>

                <span className="font-semibold text-white">
                  5 Days
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-400">
                  Remaining :
                </span>

                <span className="font-bold text-orange-400">
                  3 Days 12 Hrs
                </span>
              </div>
            </div>

          </div>

        </div>

         
       

        {/* Summary */}

       <div className="flex flex-col justify-between h-full">

        <div>
          <div className="bg-green-200 text-black text-center rounded-full text-xs py-2 mb-10">
            {order.tracking_status}
          </div>

          <p className="text-gray-500 text-center text-3xl font-bold leading-none">
            ₹{order.total_amount}
          </p>

          <p
            className={`text-center text-3xl font-bold mt-2 ${
              order.payment_status === "PAID"
                ? "text-green-400"
                : "text-orange-400"
            }`}
          >
            {order.payment_status}
          </p>

          <p className="text-center text-6xl font-bold mt-10">
            ₹{order.total_amount}
          </p>
        </div>

        <button className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold">
          🖨 Print
        </button>

      </div>

      </div>
    
    </div>
    ))}      
    <div className="border-b border-gray-700 mt-6"></div>
  
  </div>  

  );
}

