import React, { useState } from "react";
import { Search, Plus } from "lucide-react";


const OFFERS = [];

export default function OffersPage() {



  const [search, setSearch] = useState("");
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [banner, setBanner] = useState(null);
  const [extraImages, setExtraImages] = useState(Array(5).fill(null));
  const [showThumbs, setShowThumbs] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showImagePopup, setShowImagePopup] =
  useState(false);




    
  const filteredOffers = OFFERS.filter((offer) =>
    offer.title?.toLowerCase().includes(search.toLowerCase())
  );
  
  

  return (
    <div
      style={{
        padding: "24px",
        background: "#111827",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "42px",
              fontWeight: "800",
              color: "#ffffff",
              letterSpacing: "-1px",
            }}
          >
            Offers & Promo
          </h1>

          <p
            style={{
              marginTop: "8px",
              fontSize: "14px",
              color: "#94a3b8",
            }}
          >
            Manage promotional offers and campaigns
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: "relative",
            }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />

            <input
              type="text"
              placeholder="Search Offer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "260px",
                height: "42px",
                border: "1px solid #334155",
                borderRadius: "8px",
                paddingLeft: "40px",
                background: "#1e293b",
                color: "#ffffff",
                outline: "none",
              }}
            />
          </div>

          {/* Add Offer Button */}
          <button
            onClick={() => {
              setBanner(null);
              setExtraImages(Array(5).fill(null));
              setShowAddOffer(true);
            }}
                      style={{
              height: "42px",
              padding: "0 20px",
              border: "none",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontWeight: "700",
              
            }}
          >
            <Plus size={16} />
            Add Offer
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredOffers.length === 0 && (
        <div
          style={{
            height: "450px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            border: "1px dashed #334155",
            borderRadius: "12px",
            background: "#1e293b",
          }}
        >
          <h2
            style={{
              color: "#ffffff",
              fontSize: "26px",
              fontWeight: "700",
              marginBottom: "10px",
            }}
          >
            No Offers & Promo Found
          </h2>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "14px",
            }}
          >
            Click Add Offer to create your first promotional campaign.
          </p>
        </div>
      )}

      
    {showAddOffer && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "580px",
            background: "#1f2937",
            borderRadius: "12px",
            padding: "15px",
            border: "1px solid #374151",
          }}
        >
          <h2
            style={{
              color: "#fff",
              marginBottom: "20px",
            }}
          >
            Add Offer
          </h2>

          {/* Upload Section */}

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "12px",
              alignItems: "center",
            }}
          >
            {/* Main Banner */}

            <div
              onClick={() => setShowImagePopup(true)}
              style={{
                width: "100%",
                height: "120px",
                border: "2px solid #60a5fa",
                borderRadius: "6px",
                cursor: "pointer",
                overflow: "hidden",
                background: "#111827",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
            </div>
              {banner ? (
                <img
                  src={banner}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Plus size={40} color="#94a3b8" />
              )}
            </div>
          {/* Offer Name */}

          <input
            placeholder="Offer Name"
            style={{
              width: "100%",
              height: "34px",
              marginBottom: "8px",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              background: "#111827",
              color: "#fff",
              padding: "0 10px",
            }}
          />


          <input
            placeholder="Offer Percentage (Ex: 50%)"
            style={{
              width: "100%",
              height: "34px",
              marginBottom: "8px",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              background: "#111827",
              color: "#fff",
              padding: "0 10px",
            }}
          />
          {/* Description */}

          <textarea
            placeholder="Description"
            rows="3"
            style={{
              width: "100%",
              marginBottom: "8px",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              background: "#111827",
              color: "#fff",
              padding: "8px",
              resize: "none",
            }}
          />

          {/* Dates */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <input type="date" />
            <input type="time" />

            <input type="date" />
            <input type="time" />
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              style={{
                flex: 1,
                background: "#22c55e",
                color: "#fff",
                height: "36px",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Save
            </button>

            <button
              style={{
                flex: 1,
                background: "#3b82f6",
                color: "#fff",
                height: "36px",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Publish
            </button>


            <button
              onClick={() => setShowAddOffer(false)}
              style={{
                flex: 1,
                background: "#ef4444",
                color: "#fff",
                height: "36px",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            {showImagePopup && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,.7)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10000,
                }}
              >
                <div
                  style={{
                    width: "420px",
                    background: "#1f2937",
                    borderRadius: "10px",
                    padding: "20px",
                  }}
                >
                 <h3
                    style={{
                      color: "#fff",
                      marginBottom: "15px",
                      textAlign: "center",
                    }}
                  >
                    Manage Offer Images
                  </h3>

                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "center",
                    }}
                  >
                    {extraImages.map((img, index) => (
                      <label
                        key={index}
                        onClick={() => setSelectedIndex(index)}
                        style={{
                          width: "60px",
                          height: "60px",
                          border:
                            selectedIndex === index
                              ? "2px solid #3b82f6"
                              : "1px solid #4b5563",
                          borderRadius: "6px",
                          overflow: "hidden",
                          cursor: "pointer",
                          background: "#111827",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="file"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files[0];

                            if (file) {
                              const updated = [...extraImages];

                              updated[index] =
                                URL.createObjectURL(file);

                              setExtraImages(updated);
                            }
                          }}
                        />

                        {img ? (
                          <img
                            src={img}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Plus size={18} color="#94a3b8" />
                        )}
                      </label>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      marginTop: "20px",
                    }}
                  >
                    <button
                      onClick={() => {
                        document
                          .getElementById("img-upload-0")
                          ?.click();
                      }}
                      style={{
                        flex: 1,
                        background: "#3b82f6",
                        color: "#fff",
                        border: "none",
                        height: "38px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>

                    <button
                      onClick={() => {
                        if (selectedIndex === null) {
                          alert("Select image first");
                          return;
                        }

                        if (
                          window.confirm(
                            `Delete Image ${selectedIndex + 1}?`
                          )
                        ) {
                          const updated = [...extraImages];

                          updated[selectedIndex] = null;

                          setExtraImages(updated);

                          setSelectedIndex(null);
                        }
                      }}
                      style={{
                        flex: 1,
                        background: "#f59e0b",
                        color: "#fff",
                        border: "none",
                        height: "38px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>

                    <button
                      onClick={() => {
                        if (extraImages[0]) {
                          setBanner(extraImages[0]);
                        }

                        setShowImagePopup(false);
                      }}
                      style={{
                        flex: 1,
                        background: "#22c55e",
                        color: "#fff",
                        border: "none",
                        height: "38px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    )}
  </div>
);
}