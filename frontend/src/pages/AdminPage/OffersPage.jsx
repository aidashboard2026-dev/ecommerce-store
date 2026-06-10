import React, {useState,useEffect} from "react";
import { Search, Plus } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "../../services/api";

export default function OffersPage() {



  const [search, setSearch] = useState("");
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [banner, setBanner] = useState(null);
  // const [extraImages, setExtraImages] = useState(Array(5).fill(null));
  // const [showThumbs, setShowThumbs] = useState(false);
  // const [selectedIndex, setSelectedIndex] = useState(null);
  const [showImagePopup, setShowImagePopup] =
  useState(false);
  const [offerName, setOfferName] = useState("");
  const [percentage, setPercentage] = useState("");
  const [description, setDescription] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bannerFile, setBannerFile] =useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentTime, setCurrentTime] =
    useState(new Date());

  const [isOnline, setIsOnline] =
    useState(navigator.onLine);

  const checkServer = async () => {
    try {
      await api.get("/auth/me");
      return true;
    } catch {
      return false;
    }
  };

  const filteredOffers = offers
    .filter(
      (offer) =>
        offer.title
          ?.toLowerCase()
          .includes(
            search.toLowerCase()
          )
    )
    .sort((a, b) => {

      if (
        a.status === "published" &&
        b.status === "published"
      ) {
        return (
          new Date(a.expires_at) -
          new Date(b.expires_at)
        );
      }

      if (a.status === "published")
        return -1;

      if (b.status === "published")
        return 1;

      return b.id - a.id;
    });

  const validateOfferForm = () => {
    

    if (
      !bannerFile ||
      !offerName.trim() ||
      !percentage.trim() ||
      !startDate ||
      !startTime ||
      !endDate ||
      !endTime
    ) {
      toast.error(
        "⚠️ Please fill all required fields!"
      );

      return false;
    }

    if (!/^\d+$/.test(percentage)) {
      toast.error(
        "⚠️ Percentage must contain numbers only!"
      );

      return false;
    }

    if (
      Number(percentage) <= 0 ||
      Number(percentage) > 100
    ) {
      toast.error(
        "⚠️ Percentage must be between 1 and 100!"
      );

      return false;
    }

    if (
      new Date(`${endDate}T${endTime}`) <=
      new Date(`${startDate}T${startTime}`)
    ) {
      toast.error(
        "⚠️ End Date & Time must be greater than Start Date & Time!"
      );

      return false;
    }

    return true;
  };
  

  const handleSave = async () => {
    const serverAlive =
      await checkServer();

    if (!serverAlive) {
      toast.error(
        "📡 No Connection To Server!"
      );
      return;
    }

    if (!isOnline) {
      toast.error(
        "📡 No Internet Connection!"
      );
      return;
    }

    if (!validateOfferForm()) {
      return;
    }

    try {

      const formData = new FormData();

      formData.append("title", offerName);
      formData.append("percentage", percentage);
      formData.append("description", description);

      formData.append("start_date", startDate);
      formData.append("end_date", endDate);

      formData.append("start_time", startTime);
      formData.append("end_time", endTime);

      formData.append("status", "saved");

      if (bannerFile) {
        formData.append(
          "banner_image",
          bannerFile
        );
      }

      const response = await api.post(
        "/offers/",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      console.log(response.data);

      toast.success(
        "💾 Offer Saved Successfully!"
      );

      fetchOffers();
      clearForm();

    } catch (error) {

      console.error(error);

      toast.error(
        "❌ Unable to Save Offer!"
      );
    }
  };

  const handlePublish = async () => {
    const serverAlive = await checkServer();

    if (!isOnline) {
      toast.error(
        "📡 No Internet Connection!"
      );
      return;
    }

    if (!serverAlive) {
      toast.error(
        "📡 No Connection To Server!"
      );
      return;
    }


    if (!validateOfferForm()) {
      return;
    }

    try {

      const formData = new FormData();

      formData.append("title", offerName);
      formData.append("percentage", percentage);
      formData.append("description", description);

      formData.append("start_date", startDate);
      formData.append("end_date", endDate);

      formData.append("start_time", startTime);
      formData.append("end_time", endTime);

      formData.append(
        "status",
        "published"
      );

      if (bannerFile) {
        formData.append(
          "banner_image",
          bannerFile
        );
      }

      const response = await api.post(
        "/offers/",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      

      toast.success(
        "🚀 Offer Published Successfully!"
      );

      fetchOffers();
      clearForm();

    } catch (error) {

      console.error(error);

      toast.error(
        "❌ Unable to Publish Offer!"
      );
    }
  };

  const publishOffer = async (offerId) => {
    try {
      await api.put(`/offers/${offerId}`, {
        status: "published",
      });

      toast.success(
        "🚀 Offer Published Successfully!"
      );

      fetchOffers();

    } catch (error) {
      console.error(error);

      toast.error(
        "❌ Failed to Publish Offer!"
      );
    }
  };

  const deleteOffer = async (offerId) => {
    try {
      await api.delete(
        `/offers/${offerId}`
      );

      toast.success(
        "🗑️ Offer Deleted Successfully!"
      );

      fetchOffers();

    } catch (error) {
      console.error(error);

      toast.error(
        "❌ Failed to Delete Offer!"
      );
    }
  };
  
  const clearForm = () => {
    setOfferName("");
    setPercentage("");
    setDescription("");

    setStartDate("");
    setEndDate("");

    setStartTime("");
    setEndTime("");

    setBanner(null);
    setBannerFile(null);
  };
  const fetchOffers = async () => {
    try {
      const response =
        await api.get("/offers/");
      console.log(
        "OFFERS RESPONSE =",
        response.data
      );

      setOffers(
        response.data
      );
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  // const endDateTime = new Date(
  //   `${offer.end_date}T${offer.end_time}`
  // );

  // const now = new Date();

  // const remainingMs =
  //   endDateTime - now;

  // const remainingDays =
  //   Math.floor(
  //     remainingMs /
  //     (1000 * 60 * 60 * 24)
  //   );

  // const isExpired =
  //   remainingMs <= 0;
  useEffect(() => {

    const onlineHandler = () =>
      setIsOnline(true);

    const offlineHandler = () =>
      setIsOnline(false);

    window.addEventListener(
      "online",
      onlineHandler
    );

    window.addEventListener(
      "offline",
      offlineHandler
    );

    return () => {
      window.removeEventListener(
        "online",
        onlineHandler
      );

      window.removeEventListener(
        "offline",
        offlineHandler
      );
    };

  }, []);
 

  return (
    
      
    

    <div
      
      style={{
        padding: "24px",
        background: "#111827",
        minHeight: "100vh",
      }}
    >
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
        style={{
          zIndex: 99999
        }}
      />
      
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
      {filteredOffers.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill,minmax(280px,1fr))",
            gap: "20px",
          }}
        >
          {filteredOffers.map(
            (offer) => (
              <div
                key={offer.id}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "12px",
                  overflow: "hidden",

                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                  minHeight: "430px", // adjust pannalam
                }}
              >
                <img
                  src={`http://localhost:8000/${offer.banner_image}`}
                  alt=""
                  style={{
                    width:
                      "100%",
                    height:
                      "180px",
                    objectFit:
                      "cover",
                  }}
                />

                <div
                  style={{
                    padding: "15px",
                  }}
                >

                  <div
                    style={{
                      marginBottom: "12px",
                    }}
                  >
                  
                    {/* Status */}

                    {offer.status === "published" ? (
                      <span
                        style={{
                          background: "rgba(34,197,94,0.15)",
                          color: "#22c55e",
                          border: "1px solid #22c55e",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        ● Published
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          color: "#f59e0b",
                          border: "1px solid #f59e0b",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        ● Saved Draft
                      </span>
                    )}
                     

                    
                  </div>

                  <h3
                    style={{
                      color: "#fff",
                      marginTop: "10px",
                    }}
                  >
                    {offer.title}
                  </h3>

                  <p
                    style={{
                      color: "#fce307",
                      fontWeight: "700",
                    }}
                  >
                    {offer.percentage}%
                  </p>

                  <p
                    style={{
                      color: "#94a3b8",
                    }}
                  >
                    {offer.description}
                  </p>

                </div>
                <div
                  style={{
                    marginTop: "12px",
                    color: "#cbd5e1",
                    fontSize: "13px",
                    padding: "0 15px 15px",

                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    flex: 1,
                  }}
                >
                  {offer.status === "saved" ? (
                    <div
                      style={{
                        color: "#07fc96",
                        fontWeight: "700",
                        lineHeight: "1.8",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        📅 Start:
                        {" "}
                        {offer.start_date}
                        {" "}
                        {offer.start_time}
                      </div>

                      <div>
                        ⏳ End:
                        {" "}
                        {offer.end_date}
                        {" "}
                        {offer.end_time}
                      </div>
                    </div>
                  ) : (
                <>
                      {(() => {
                       
                       
            
                        // if (!offer.published_at) {
                        //   return (
                        //     <div
                        //       style={{
                        //         color: "#f59e0b",
                        //         fontWeight: "700",
                        //       }}
                        //     >
                        //       ⚠️ Publish Time Missing
                        //     </div>
                        //   );
                        // }

                        const expiresAt =
                          new Date(
                            offer.expires_at + "Z"
                          );
                        const diff =
                          expiresAt.getTime() -
                          currentTime.getTime();

                        console.log("CURRENT TIME =", currentTime);
                        console.log("EXPIRES AT =", expiresAt);
                        console.log(
                          "DIFF HOURS =",
                          diff / (1000 * 60 * 60)
                        );

                        if (!offer.expires_at) {
                          return (
                            <div
                              style={{
                                color: "#f59e0b",
                                fontWeight: "700",
                              }}
                            >
                              ⚠️ Expiry Time Missing
                            </div>
                          );
                        }
                                                

                        const days = Math.floor(
                          diff / (1000 * 60 * 60 * 24)
                        );

                        const hours = Math.floor(
                          (diff % (1000 * 60 * 60 * 24)) /
                          (1000 * 60 * 60)
                        );

                        const minutes = Math.floor(
                          (diff % (1000 * 60 * 60)) /
                          (1000 * 60)
                        );
                        
                        // console.log(
                        //   "TOTAL HOURS =",
                        //   totalDuration / (1000 * 60 * 60)
                        // );

                        // console.log(
                        //   "DIFF HOURS =",
                        //   diff / (1000 * 60 * 60)
                        // );
                        return (
                          <div
                            style={{
                              color: "#f10b64",
                              fontWeight: "700",
                              fontSize: "13px",
                            }}
                          >
                            ⏰ Ends In:
                            {" "}
                            {days} Days,
                            {" "}
                            {hours} Hr,
                            {" "}
                            {minutes} Min
                          </div>
                        );
                      })()}
                    </>
                  )}

                  

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      marginTop: "auto",
                      paddingTop: "15px",
                    }}
                  >
                    {offer.status === "saved" && (
                      <button
                        onClick={() =>
                          publishOffer(offer.id)
                        }
                        style={{
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 10px",
                          height: "28px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Publish
                      </button>
                    )}

                    <button
                      onClick={() =>
                        deleteOffer(offer.id)
                      }
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 10px",
                        height: "28px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
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
              marginBottom: "12px",
            }}
          >
            <label
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
              <input
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];

                  if (file) {
                    setBanner(
                      URL.createObjectURL(file)
                    );

                    setBannerFile(file);
                  }
                }}
              />

              {banner ? (
                <img
                  src={banner}
                  alt="Offer Banner"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Plus size={40} color="#94a3b8" />
              )}
            </label>
          </div>
          {/* Offer Name */}

          <input
            placeholder="Offer Name"
            value={offerName}
            onChange={(e) => setOfferName(e.target.value)}
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
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <button
              onClick={handleSave}
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
              onClick={handlePublish}
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

          </div>


        </div>
      </div>
    )}
  </div>
);
}