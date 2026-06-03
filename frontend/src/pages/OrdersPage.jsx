
import { useState } from "react";
import { Search } from "lucide-react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function OrdersPage() {

  const [date, setDate] = useState(new Date());

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
      <div className="mt-8 pt-5 border-t border-gray-700">

        <div className="flex justify-between items-center border-b border-gray-700 pb-5">

          <div>
            <span className="font-bold">ORD-9832</span>
            <span className="ml-4">Date : 2026-05-19</span>
          </div>

          <div className="flex items-center gap-2">

            <span className="text-xs text-gray-400 mr-2">
              Operation Action :
            </span>

            <button className="px-3 py-1 border rounded text-xs">
              Process
            </button>

            <button className="px-3 py-1 bg-orange-300 text-black rounded text-xs">
              Shipped
            </button>

            <button className="px-3 py-1 bg-green-300 text-black rounded text-xs">
              Deliver
            </button>

          </div>

        </div>

        <div className="grid grid-cols-[1fr_1.4fr_280px] gap-8 mt-8">

  {/* Customer */}

        <div className="pr-8 border-r border-gray-700">

          <h3 className="text-gray-400 text-2xl font-bold mb-4">
            Customer Registry
          </h3>

          <p className="text-4xl font-bold">
            Aarav Sharma
          </p>

          <p className="text-gray-500 underline text-sm">
            aarav.sharma@gmail.com
          </p>

          <div className="mt-4 space-y-2 text-sm">

            <p>Address:</p>

            <p className="font-semibold ml-5">
              address 1
            </p>

            <p className="font-semibold ml-5">
              address 2
            </p>

            <p className="font-semibold ml-5">
              address 3
            </p>

            <p className="font-semibold ml-5">
              636305
            </p>

          </div>

          <div className="mt-6 text-sm">

            <p className="text-gray-400">
              Receipt Method :
              <span className="text-orange-400 ml-2 font-bold">
                COD
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
            Purchased Items (2)
          </h3>

          <div className="flex items-start gap-4 mb-8">

            <div className="w-12 h-12 border-2 border-gray-500 rounded overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300"
                alt="Product"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
            
            <div className="flex-1">

              <p>
                AeroWeave Oversized Tee
              </p>

              <p className="text-sm text-gray-400">
                Size Selection: M
              </p>

              <p className="text-sm text-gray-400">
                Col: Vintage Black
              </p>

              <p className="text-sm text-gray-400">
                Qty: 1
              </p>

            </div>

            <p>₹549</p>

          </div>

          <div className="flex items-start gap-4">

            

            <div className="w-12 h-12 border-2 border-gray-500 rounded overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1542272604-787c3835535d?w=300"
                alt="Product"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>

            

            <div className="flex-1">

              <p>
                Japanese Selvedge Denim
              </p>

              <p className="text-sm text-gray-400">
                Size Selection: M
              </p>

              <p className="text-sm text-gray-400">
                Col: Indigo Raw
              </p>

              <p className="text-sm text-gray-400">
                Qty: 1
              </p>

            </div>

            <p>₹1649</p>

          </div>

        </div>

        {/* Summary */}

        <div>

          <div className="bg-green-200 text-black text-center rounded-full text-xs py-1 mb-6">
            DELIVERED
          </div>

          <p className="text-gray-500 text-center text-3xl font-bold leading-none">
            Total
          </p>

          <p className="text-gray-500 text-center text-3xl font-bold">
            Settled
          </p>

          <p className="text-center text-6xl font-bold mt-5">
            ₹2248
          </p>

          <button className="w-full mt-8 bg-yellow-500 text-black py-2 rounded-lg">
            🖨 Print
          </button>

        </div>

      </div>

    </div>

    <div className="border-b border-gray-700 mt-6"></div>

  </div>  

  );
}

