import { useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
gsap.registerPlugin(useGSAP, ScrollTrigger);

const Home = () => {
  const container = useRef();

  // useGSAP(
  //   () => {
  //     // 1. Hero Section Animation (On Load)
  //     const tl = gsap.timeline();
  //     tl.from(".hero-text", {
  //       y: 50,
  //       opacity: 0,
  //       duration: 1,
  //       stagger: 0.2,
  //       ease: "power3.out",
  //     }).from(
  //       ".hero-btn",
  //       {
  //         y: 20,
  //         opacity: 0,
  //         duration: 0.8,
  //         stagger: 0.2,
  //         ease: "back.out(1.7)",
  //       },
  //       "-=0.5",
  //     );

  //     // 2. Features Section (Scroll Trigger)
  //     gsap.from(".feature-card", {
  //       scrollTrigger: {
  //         trigger: "#about",
  //         start: "top 80%",
  //       },
  //       y: 100,
  //       opacity: 0,
  //       duration: 0.8,
  //       stagger: 0.2,
  //       ease: "power2.out",
  //     });

  //     // 3. Our Story Section
  //     gsap.from(".story-item", {
  //       scrollTrigger: {
  //         trigger: "#our-story",
  //         start: "top 75%",
  //       },
  //       y: 50,
  //       opacity: 0,
  //       duration: 0.8,
  //       stagger: 0.2,
  //     });

  //     // 4. Gaming Zones (Alternating slide-ins)
  //     gsap.utils.toArray(".zone-row").forEach((row, i) => {
  //       const img = row.querySelector(".zone-img");
  //       const text = row.querySelector(".zone-text");

  //       gsap.from(img, {
  //         scrollTrigger: { trigger: row, start: "top 80%" },
  //         x: i % 2 === 0 ? -100 : 100,
  //         opacity: 0,
  //         duration: 1,
  //         ease: "power3.out",
  //       });

  //       gsap.from(text, {
  //         scrollTrigger: { trigger: row, start: "top 80%" },
  //         x: i % 2 === 0 ? 100 : -100,
  //         opacity: 0,
  //         duration: 1,
  //         ease: "power3.out",
  //       });
  //     });

  //     // 5. Tournaments & Pricing Cards
  //     gsap.from(".tournament-card", {
  //       scrollTrigger: { trigger: "#tournaments", start: "top 80%" },
  //       y: 100,
  //       opacity: 0,
  //       duration: 0.8,
  //       stagger: 0.2,
  //       ease: "back.out(1.5)",
  //     });

  //     gsap.from(".pricing-card", {
  //       scrollTrigger: { trigger: "#pricing", start: "top 80%" },
  //       scale: 0.8,
  //       opacity: 0,
  //       duration: 0.8,
  //       stagger: 0.2,
  //       ease: "power2.out",
  //     });
  //   },
  //   { scope: container },
  // );

  return (
    <main ref={container}>
      {/* Hero Section */}
      <section
        id="home"
        className="min-h-screen flex items-center justify-center relative bg-cover bg-center bg-no-repeat overflow-hidden"
        style={{
          backgroundImage:
            "url('https://rog.asus.com/media/1744332210542.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-linear-to-b from-black/80 to-black/60"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h1 className="hero-text text-5xl md:text-7xl font-bold mb-6 gradient-text">
            Ultimate Gaming Experience
          </h1>
          <p className="hero-text text-xl md:text-2xl mb-8 text-gray-200">
            Premium Gaming PCs • VR Zone • Esports Arena • Comfort Lounge
          </p>
          <div className="flex justify-center space-x-4 overflow-hidden py-2">
            <Link to="/booking">
              <button className="hero-btn bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-full text-lg font-semibold transition-all transform hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                Book Now
              </button>
            </Link>
            <Link to="/gallery">
              <button className="hero-btn border-2 border-purple-500 hover:bg-purple-500 px-8 py-3 rounded-full text-lg font-semibold transition-all">
                Tour Facility
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="about" className="py-20 bg-gray-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 feature-card">
            <h2 className="text-4xl font-bold mb-4 gradient-text">
              Why Choose Nexus?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Experience gaming like never before with our state-of-the-art
              facilities and premium services
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card bg-gray-900 p-6 rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <i className="fas fa-tachometer-alt text-purple-500 text-4xl mb-4"></i>
              <h3 className="text-xl font-bold mb-2">High-Performance PCs</h3>
              <p className="text-gray-400">
                RTX 4090 GPUs • i9 Processors • 240Hz Monitors • Custom Cooling
              </p>
            </div>
            <div className="feature-card bg-gray-900 p-6 rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <i className="fas fa-vr-cardboard text-purple-500 text-4xl mb-4"></i>
              <h3 className="text-xl font-bold mb-2">VR Experience</h3>
              <p className="text-gray-400">
                Meta Quest Pro • Full Body Tracking • Haptic Feedback •
                Exclusive VR Games
              </p>
            </div>
            <div className="feature-card bg-gray-900 p-6 rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <i className="fas fa-trophy text-purple-500 text-4xl mb-4"></i>
              <h3 className="text-xl font-bold mb-2">Esports Ready</h3>
              <p className="text-gray-400">
                Tournament Hosting • Professional Setup • Live Streaming • Prize
                Pools
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section id="our-story" className="py-20 bg-gray-900 overflow-hidden">
        <div className="container mx-auto px-6 border-t border-gray-800 pt-8">
          <div className="text-center mb-12 story-item">
            <h3 className="text-2xl font-bold gradient-text mb-4">Our Story</h3>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Founded in 2020, Nexus Gaming Cafe was born from a passion for
              gaming and community. Our mission is to create a space where
              gamers of all levels can come together, compete, and create
              lasting memories.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="story-item bg-gray-800 p-6 rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <i className="fas fa-heart text-purple-500 text-4xl mb-4"></i>
              <h4 className="text-xl font-bold mb-2">Our Values</h4>
              <p className="text-gray-400">
                Community, Innovation, and Excellence in Gaming
              </p>
            </div>
            <div className="story-item bg-gray-800 p-6 rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <i className="fas fa-trophy text-purple-500 text-4xl mb-4"></i>
              <h4 className="text-xl font-bold mb-2">Our Achievements</h4>
              <p className="text-gray-400">
                Hosted 100+ Tournaments, 5000+ Happy Gamers
              </p>
            </div>
            <div className="story-item bg-gray-800 p-6 rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <i className="fas fa-star text-purple-500 text-4xl mb-4"></i>
              <h4 className="text-xl font-bold mb-2">Our Vision</h4>
              <p className="text-gray-400">
                To be the Ultimate Gaming Destination
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gaming Zones Section */}
      <section id="games" className="py-20 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 gradient-text">
              Gaming Zones
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Explore our diverse gaming environments designed for every type of
              gamer
            </p>
          </div>

          <div className="zone-row grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="zone-img relative group">
              <img
                src="https://savameta.com/wp-content/uploads/2024/12/gamevr-toi-uu-xaydung-1.png"
                alt="VR Zone"
                className="rounded-lg transform group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-purple-500/20 rounded-lg"></div>
            </div>
            <div className="zone-text">
              <h2 className="text-4xl font-bold mb-4">VR Gaming Zone</h2>
              <p className="text-gray-400 mb-6">
                Immerse yourself in virtual reality with our premium VR setups
                featuring the latest games and full-body tracking systems.
              </p>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Meta
                  Quest Pro Headsets
                </li>
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Full
                  Body Tracking
                </li>
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Haptic
                  Feedback Suits
                </li>
              </ul>
            </div>
          </div>

          <div className="zone-row grid md:grid-cols-2 gap-12 items-center">
            <div className="zone-text order-2 md:order-1">
              <h2 className="text-4xl font-bold mb-4">Esports Arena</h2>
              <p className="text-gray-400 mb-6">
                Compete in our professional-grade esports arena equipped with
                tournament-grade setups and streaming capabilities.
              </p>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i>{" "}
                  Tournament Hosting
                </li>
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Live
                  Streaming Setup
                </li>
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Prize
                  Pool Management
                </li>
              </ul>
            </div>
            <div className="zone-img relative group order-1 md:order-2">
              <img
                src="https://britishesports.org/wp-content/uploads/fly-images/23786/25-06-2023-Student-Champ-Finals-British-Esports-HIGH-351-2-767x710.jpg"
                alt="Esports Arena"
                className="rounded-lg transform group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-purple-500/20 rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Skipped Tournaments for brevity, you can add it just like Features) */}
      <section id="pricing" className="py-20 bg-gray-800">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 gradient-text">
              Membership Plans
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Standard Plan */}
            <div className="pricing-card bg-gray-900 p-8 rounded-xl text-center hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <h3 className="text-2xl font-bold mb-4">Casual Gamer</h3>
              <p className="text-4xl font-bold text-purple-500 mb-6">
                $5<span className="text-xl text-gray-400">/hr</span>
              </p>
              <ul className="space-y-3 mb-8 text-gray-400">
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Standard
                  Access
                </li>
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i>{" "}
                  High-Speed Internet
                </li>
              </ul>
              <Link to="/payment">
                <button className="bg-purple-600 w-full py-2 rounded-lg hover:bg-purple-700">
                  Choose Plan
                </button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="pricing-card bg-gray-900 p-8 rounded-xl text-center transform hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all border border-purple-500/30">
              <h3 className="text-2xl font-bold mb-4">Pro Gamer</h3>
              <p className="text-4xl font-bold text-purple-500 mb-6">
                $8<span className="text-xl text-gray-400">/hr</span>
              </p>
              <ul className="space-y-3 mb-8 text-gray-400">
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Premium
                  Access
                </li>
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> High-End
                  PCs
                </li>
              </ul>
              <Link to="/payment">
                <button className="bg-purple-600 w-full py-2 rounded-lg hover:bg-purple-700">
                  Choose Plan
                </button>
              </Link>
            </div>

            {/* VIP Plan */}
            <div className="pricing-card bg-gray-900 p-8 rounded-xl text-center hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
              <h3 className="text-2xl font-bold mb-4">VIP Member</h3>
              <p className="text-4xl font-bold text-purple-500 mb-6">
                $15<span className="text-xl text-gray-400">/hr</span>
              </p>
              <ul className="space-y-3 mb-8 text-gray-400">
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> Private
                  Room
                </li>
                <li>
                  <i className="fas fa-check text-purple-500 mr-2"></i> 24/7
                  Access
                </li>
              </ul>
              <Link to="/payment">
                <button className="bg-purple-600 w-full py-2 rounded-lg hover:bg-purple-700">
                  Choose Plan
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
