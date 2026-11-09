import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { SITE } from "@/config/site";
import "@/styles/whatsapp.css";

const WhatsAppButton = () => {
  // Agar SITE config mein WhatsApp number available hai toh wo use hoga
  const phoneNumber = "923325191625";
  const message = "Hello! I need more information about AsianFX signals.";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      className="whatsapp-float"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
    >
      <FaWhatsapp size={28} />
    </a>
  );
};

export default WhatsAppButton;
