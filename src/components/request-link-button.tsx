import { MessageCircle } from "lucide-react";

export function RequestLinkButton() {
  const number = (process.env.WHATSAPP_CONTACT_NUMBER ?? "5491144196172").replace(/[\s()+-]/g, "");
  const href = number && /^[1-9]\d{7,14}$/.test(number)
    ? `https://wa.me/${number}?text=${encodeURIComponent("Mandame mi enlace de Tartópolis.")}`
    : null;

  if (!href) return <button type="button" disabled className="primary-button mt-6 w-full opacity-50"><MessageCircle size={18} />Pedir enlace</button>;

  return <a href={href} target="_blank" rel="noopener noreferrer" className="primary-button mt-6 w-full"><MessageCircle size={18} />Pedir enlace</a>;
}
