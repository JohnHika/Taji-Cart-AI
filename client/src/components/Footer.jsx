import React from 'react'
import { FaWhatsapp } from "react-icons/fa";
import { FaFacebook } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";

const Footer = () => {
  return (
    <footer className='border-t'>
        <div className='container mx-auto p-4 text-center flex flex-col lg:flex-row lg:justify-between gap-2'>
            <p>© All Rights Reserved 2025.</p>

            <div className='flex items-center gap-4 justify-center text-2xl'>
                <a href='' className='hover:text-primary-100' aria-label='WhatsApp'>
                    <FaWhatsapp />
                </a>
                <a href='https://www.instagram.com/nawiri_hairke/' target='_blank' rel='noopener noreferrer' className='hover:text-primary-100' aria-label='Instagram'>
                    <FaInstagram/>
                </a>
                <a href='https://www.tiktok.com/discover/nawiri-hair-kenya?is_from_webapp=1&sender_device=pc' target='_blank' rel='noopener noreferrer' className='hover:text-primary-100' aria-label='TikTok'>
                    <FaTiktok/>
                </a>
            </div>
        </div>
    </footer>
  )
}

export default Footer
