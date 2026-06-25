import Lottie from "lottie-react";
import customers from "@/shared/assets/customers.json";

export function CustomersIcon() {
    return(
        <Lottie animationData={customers} loop={true} autoplay={true} style={{ width: 48, height: 48 }} />
    );
}