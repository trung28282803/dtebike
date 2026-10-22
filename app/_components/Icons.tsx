/* Icon giao diện chung — vẽ theo bộ Lucide (https://lucide.dev, giấy phép ISC), inline SVG
   để đổi màu theo `currentColor` và sắc nét ở mọi kích thước. Logo thương hiệu (Facebook,
   Messenger, Gmail, Zalo, KakaoTalk, Google Maps) là file chính thức trong public/icons/. */

import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, rest: SVGProps<SVGSVGElement>) =>
  ({
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false,
    ...rest,
  }) as const;

export const PhoneIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export const MessageIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

export const MailIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export const MapPinIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const ClockIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const BikeIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="18.5" cy="17.5" r="3.5" />
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="15" cy="5" r="1" />
    <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
  </svg>
);

export const WrenchIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const TruckIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
    <circle cx="17" cy="18" r="2" />
    <circle cx="7" cy="18" r="2" />
  </svg>
);

export const BatteryIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
    <line x1="22" x2="22" y1="11" y2="13" />
    <line x1="6" x2="6" y1="11" y2="13" />
    <line x1="10" x2="10" y1="11" y2="13" />
    <line x1="14" x2="14" y1="11" y2="13" />
  </svg>
);

export const SearchIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const ArrowRightIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const CameraIcon = ({ size = 18, ...r }: P) => (
  <svg {...base(size, r)}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

/* Logo thương hiệu — file chính thức, không đổi màu. */
export const BRAND_ICON = {
  facebook: "/icons/facebook.svg",
  messenger: "/icons/messenger.svg",
  gmail: "/icons/gmail.svg",
  zalo: "/icons/zalo.svg",
  kakao: "/icons/kakaotalk.svg",
  tiktok: "/icons/tiktok.svg",
  maps: "/icons/google-maps.svg",
  naver: "/icons/naver-map.svg",
} as const;

export const BrandIcon = ({ name, size = 20 }: { name: keyof typeof BRAND_ICON; size?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img className="ico-img" src={BRAND_ICON[name]} alt="" width={size} height={size} />
);
