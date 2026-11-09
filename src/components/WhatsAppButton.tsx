'use client';

import React from "react";
import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { useCurrentUser } from "@/hooks/useAuth";
import "@/styles/whatsapp.css";

// Admins never get the button (their dashboard is also /dashboard) — members and visitors see it everywhere.
const HIDDEN_ROUTES = ['/admin', '/bossjutt'];

const WhatsAppButton = () => {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  if (user?.is_admin) return null;
  if (HIDDEN_ROUTES.some((p) => pathname === p || pathname?.startsWith(`${p}/`))) return null;

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
