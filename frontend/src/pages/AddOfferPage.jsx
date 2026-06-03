
// add offer page logic 

import React, { useState } from "react";
import { ImagePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function AddOfferPage() {
  const [banner, setBanner] = useState(null);
  const navigate = useNavigate();

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (file) {
      setBanner(URL.createObjectURL(file));
    }


  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px",
      }}
    >
      <div
        style={{
          width: "700px",
          background: "#1f2937",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #374151",
        }}
      >
        {/* Upload Section */}
        <div
          style={{
            display: "flex",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          {/* Main Upload */}
          <label
            style={{
              width: "420px",
              height: "180px",
              border: "2px dashed #60a5fa",
              borderRadius: "8px",
              cursor: "pointer",
              overflow: "hidden",
              background: "#111827",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <input
              type="file"
              hidden
              onChange={handleImage}
            />

            {banner ? (
              <img
                src={banner}
                alt="offer"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <ImagePlus
                size={55}
                color="#9ca3af"
              />
            )}
          </label>

          {/* Preview Boxes */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "flex-end",
            }}
          >
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                style={{
                  width: "55px",
                  height: "55px",
                  border: "1px solid #4b5563",
                  borderRadius: "6px",
                  background: "#111827",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ImagePlus
                  size={18}
                  color="#9ca3af"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Offer Name */}
        <input
          type="text"
          placeholder="Offer Name"
          style={{
            width: "100%",
            height: "42px",
            marginBottom: "12px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#111827",
            color: "#fff",
            padding: "0 12px",
            outline: "none",
          }}
        />

        {/* Description */}
        <textarea
          placeholder="Description"
          rows="4"
          style={{
            width: "100%",
            marginBottom: "12px",
            borderRadius: "6px",
            border: "1px solid #4b5563",
            background: "#111827",
            color: "#fff",
            padding: "12px",
            resize: "none",
            outline: "none",
          }}
        />

        {/* Dates */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <input
            type="date"
            style={{
              flex: 1,
              height: "42px",
              borderRadius: "6px",
              border: "1px solid #4b5563",
              background: "#111827",
              color: "#fff",
              padding: "0 12px",
            }}
          />

          <input
            type="date"
            style={{
              flex: 1,
              height: "42px",
              borderRadius: "6px",
              border: "1px solid #4b5563",
              background: "#111827",
              color: "#fff",
              padding: "0 12px",
            }}
          />
        </div>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            style={{
              flex: 1,
              height: "42px",
              border: "none",
              borderRadius: "6px",
              background: "#22c55e",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Save
          </button>

          <button
            style={{
              flex: 1,
              height: "42px",
              border: "none",
              borderRadius: "6px",
              background: "#3b82f6",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Publish
          </button>

          <button
            style={{
              flex: 1,
              height: "42px",
              border: "none",
              borderRadius: "6px",
              background: "#ef4444",
              color: "#fff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}