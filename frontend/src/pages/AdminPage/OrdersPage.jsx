
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  getOrders,
  updateOrderStatus,
} from "../../services/order_Service";

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
  const downloadInvoice = (order) => {

    const pdf = new jsPDF();

    pdf.setFontSize(22);
    pdf.text("My Design", 85, 20);

    pdf.setFontSize(12);
    pdf.text("T-Shirt Store Invoice", 70, 28);

    pdf.line(10, 35, 200, 35);

    pdf.text(
      `Invoice No : ${order.order_number}`,
      10,
      50
    );

    pdf.text(
      `Date : ${order.ordered_at?.split("T")[0]}`,
      10,
      58
    );

    pdf.line(10, 65, 200, 65);

    pdf.setFontSize(14);
    pdf.text("Customer Details", 10, 75);

    pdf.setFontSize(11);

    pdf.text(
      `Name : ${order.customer_name}`,
      10,
      85
    );

    pdf.text(
      `Email : ${order.customer_email}`,
      10,
      93
    );

    pdf.text(
      `Phone : ${order.customer_phone}`,
      10,
      101
    );

    pdf.text(
      `Address : ${order.address_line1}`,
      10,
      109
    );

    pdf.text(
      `${order.city} - ${order.pincode}`,
      10,
      117
    );

    pdf.line(10, 125, 200, 125);

    pdf.setFontSize(14);
    pdf.text("Order Details", 10, 135);

    pdf.setFontSize(11);

    pdf.text(
      `Product : ${order.product_name}`,
      10,
      145
    );

    pdf.text(
      `Size : ${order.size}`,
      10,
      153
    );

    pdf.text(
      `Color : ${order.color}`,
      10,
      161
    );

    pdf.text(
      `Quantity : ${order.quantity}`,
      10,
      169
    );

    pdf.text(
      `Price : ₹${order.price}`,
      10,
      177
    );

    pdf.line(10, 185, 200, 185);

    pdf.setFontSize(14);
    pdf.text("Payment Summary", 10, 195);

    pdf.setFontSize(11);

    pdf.text(
      `Subtotal : ₹${order.total_amount}`,
      10,
      205
    );

    pdf.text(
      "Shipping : FREE",
      10,
      213
    );

    pdf.text(
      "Tax : ₹0",
      10,
      221
    );

    pdf.line(10, 228, 200, 228);

    pdf.setFontSize(14);

    pdf.text(
      `Total : ₹${order.total_amount}`,
      10,
      238
    );

    pdf.line(10, 245, 200, 245);

    pdf.setFontSize(11);

    pdf.text(
      `Payment Status : ${order.payment_status}`,
      10,
      255
    );

    pdf.text(
      `Tracking Status : ${order.tracking_status}`,
      10,
      263
    );

    pdf.save(
      `Invoice-${order.order_number}.pdf`
    );
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
    const newOrders = orders.filter(
      (o) => o.tracking_status === "PLACED"
    ).length;

    const pendingOrders = orders.filter(
      (o) => o.tracking_status === "PROCESSING"
    ).length;

    const shippedOrders = orders.filter(
      (o) => o.tracking_status === "SHIPPED"
    ).length;

    const deliveredOrders = orders.filter(
      (o) => o.tracking_status === "DELIVERED"
    ).length;

    console.log(
      orders.map((o) => ({
        id: o.id,
        status: o.tracking_status,
      }))
    );

    console.log("NEW =", newOrders);
    console.log("PENDING =", pendingOrders);
    console.log("SHIPPED =", shippedOrders);
    console.log("DELIVERED =", deliveredOrders);
  return (
    <div className="p-8 text-white">
    <div className="flex flex-col xl:flex-row justify-between items-start gap-6">

      {/* Left Side */}
      <div className="flex-1 mr-6">

        <h1 className="text-[64px] font-bold leading-none text-white">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 w-full">

          <div className="w-full min-h-[130px] bg-sky-300 rounded-lg px-3 py-3 flex flex-col justify-between">
            <p className="font-bold text-sky-700 text-lg md:text-xl">
              New Orders
            </p>
            <p className="text-4xl md:text-5xl font-bold text-sky-700 leading-none">
              {newOrders}
            </p>
          </div>

          <div className="w-full min-h-[130px] bg-orange-200 rounded-lg px-3 py-3 flex flex-col justify-between">
            <p className="font-bold text-orange-600 text-lg md:text-xl">
              Shipped
            </p>
            <p className="text-4xl md:text-5xl font-bold text-orange-600 leading-none">
              {shippedOrders}
            </p>
          </div>

          <div className="w-full min-h-[130px] bg-green-200 rounded-lg px-3 py-3 flex flex-col justify-between">
            <p className="font-bold text-green-600 text-lg md:text-xl">
              Delivered
            </p>
            <p className="text-4xl md:text-5xl font-bold text-green-600 leading-none">
              {deliveredOrders}
            </p>
          </div>

          <div className="w-full min-h-[130px] bg-red-100 rounded-lg px-3 py-3 flex flex-col justify-between">
            <p className="font-bold text-red-500 text-lg md:text-xl">
              Pending
            </p>
            <p className="text-4xl md:text-5xl font-bold text-red-500 leading-none">
              {pendingOrders}
            </p>
          </div>

        </div>

       

      </div>

      {/* Calendar */}
      <div className="w-full xl:w-[260px] h-auto">

        <Calendar 
          onChange={setDate}
          value={date}
          className="rounded-xl overflow-hidden border border-gray-700 text-white "
        />

      </div>
      
{/* card --oder details cutomer wise  */}
    </div>
    
      {orders.map((order) => (
        
      <div
        key={order.id}
        className="mt-8 pt-5 border-t border-gray-700"
      >
       <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-gray-700 pb-5">

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">

            <span className="font-bold text-white break-all">
              {order.order_number}
            </span>

            <span className="text-gray-300">
              Date : {order.ordered_at?.split("T")[0]}
            </span>

          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">

              <span className="text-xs text-gray-400">
                Operation Action :
              </span>

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={() =>
                    handleStatusUpdate(
                      order.id,
                      "PROCESSING"
                    )
                  }
                  className={`px-3 py-1 rounded text-xs text-white transition ${
                    order.tracking_status === "PROCESSING"
                      ? "bg-blue-500 border-blue-500"
                      : "border border-gray-500"
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
                  className={`px-3 py-1 rounded text-xs transition ${
                    order.tracking_status === "SHIPPED"
                      ? "bg-orange-400 text-black border-orange-400"
                      : "border border-gray-500 text-white"
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
                  className={`px-3 py-1 rounded text-xs text-white transition ${
                    order.tracking_status === "DELIVERED"
                      ? "bg-green-500 border-green-500"
                      : "border border-gray-500"
                  }`}
                >
                  Deliver
                </button>

              </div>

            </div>

        </div>

        <div
          id={`invoice-${order.id}`}
          className="
          grid
          grid-cols-1
          lg:grid-cols-[1fr_1.4fr_280px]
          gap-8
          mt-8
          "
        >

  {/* Customer */}

        <div className="pr-8 border-r border-gray-700 flex flex-col justify-between">

          <h3 className="text-gray-400 text-2xl font-bold mb-4">
            Customer Registry
          </h3>


          <p className="text-2xl md:text-4xl font-bold text-white break-words">
            {order.customer_name}
          </p>

          <div className="mt-8 space-y-4 text-sm">

            <p>Address:</p>

            <p className="font-semibold ml-5 text-gray-200">
              {order.address_line1}
            </p>

            <p className="font-semibold ml-5 text-gray-200">
              {order.address_line2}
            </p>
            <p className="font-semibold ml-5 text-gray-200">
              {order.city}
            </p>
            <p className="font-semibold ml-5 text-gray-200">
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

            <p className="mt-3 text-gray-200">
              Dispatch logistics :
              <span className="font-bold ml-2 text-white">
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

              <p className="font-semibold text-lg text-white">
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

            <p className="font-semibold text-lg text-white">
              ₹{order.price}
            </p>

          </div>

          {/* Price Breakdown */}

          <div className="border-t border-gray-700 pt-4 space-y-3">

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Product Price
              </span>
              <span className="text-white">
                ₹{order.price}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Quantity
              </span>
              <span className="text-white">
                {order.quantity}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400 text-white">
                Shipping
              </span>
              <span className="text-green-400 text-white">
                FREE
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-400 text-white">
                Tax
              </span>
              <span className="text-white">
                ₹0
              </span>
            </div>

            <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-lg">
              <span className="text-white ">
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

          <p className="text-gray-200 text-center text-3xl font-bold leading-none">
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

          <p className="text-center text-4xl md:text-6xl font-bold mt-10 text-white">
            ₹{order.total_amount}
          </p>
        </div>

        <button
          onClick={() => downloadInvoice(order)}
          className="w-full bg-yellow-500 text-black py-3 rounded-lg font-semibold"
        >
          🖨 Download Invoice
        </button>

      </div>

      </div>
    
    </div>
    ))}      
    <div className="border-b border-gray-700 mt-6"></div>
  
  </div>  

  );
}

