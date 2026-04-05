import { useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Gallery = () => {
  const container = useRef();

  useGSAP(
    () => {
      // Header Animation
      gsap.from(".gallery-header", {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      // Masonry Images Stagger Animation
      gsap.from(".gallery-img", {
        scrollTrigger: {
          trigger: ".masonry",
          start: "top 85%", // Starts animating when gallery top hits 85% of screen
        },
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1, // Har image 0.1s ke gap par aayegi
        ease: "back.out(1.2)",
      });
    },
    { scope: container },
  );

  const images = [
    "https://images.wallpapersden.com/image/download/ghostrunner-4k-gaming_bWdmZ26UmZqaraWkpJRobWllrWdma2U.jpg",
    "https://images.wallpapersden.com/image/download/gaming-poster-of-horizon-call-of-the-mountain-4k_bmVrbWuUmZqaraWkpJRobWllrWdma2U.jpg",
    "https://images.wallpapersden.com/image/download/assassins-s-creed-shadows-4k-gaming_bmdtZWmUmZqaraWkpJRobWllrWdmbm4.jpg",
    "https://rog.asus.com/media/1610082227143.jpg",
    "https://assets-prd.ignimgs.com/2024/10/04/hero-1728069720656.jpg",
    "https://i.pinimg.com/1200x/f2/7c/ef/f27cefb92c87f96a1225323959ec22c2.jpg",
    "https://i.pinimg.com/1200x/ea/c1/bf/eac1bfc76f13d5366636c26517ff7c2d.jpg",
    "https://wallpapercave.com/wp/wp4983330.jpg",
    "https://i.pinimg.com/736x/fe/36/81/fe3681b679a06351fc8334e0b0b32463.jpg",
    "https://i.pinimg.com/1200x/0d/ad/a1/0dada1304d2febe68713b744d347d6de.jpg",
    "https://rare-gallery.com/uploads/posts/583119-games-4k-computer.jpg",
    "https://c4.wallpaperflare.com/wallpaper/162/894/557/colorful-neon-computer-keyboards-wallpaper-preview.jpg",
  ];

  return (
    <section ref={container} className="py-32 bg-gray-900 min-h-screen">
      <div className="container mx-auto px-6">
        <div className="gallery-header text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 gradient-text">
            Our Gaming Gallery
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Take a sneak peek at Nexus Gaming Cafe’s vibrant atmosphere,
            high-end setups, and exciting tournaments.
          </p>
        </div>

        <div className="masonry columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {images.map((src, index) => (
            <div key={index} className="gallery-img break-inside-avoid">
              <img
                src={src}
                alt={`Gaming Setup ${index + 1}`}
                loading="lazy"
                className="w-full h-auto rounded-xl shadow-lg hover:shadow-purple-500/50 transition-shadow duration-300"
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/"
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg text-white font-semibold transition-all transform hover:scale-105 shadow-md inline-block"
          >
            🏠 Go Home
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Gallery;
