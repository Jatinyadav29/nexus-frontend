import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

// Register GSAP plugin
gsap.registerPlugin(useGSAP);

const TournamentList = () => {
  const container = useRef();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch registered teams from the backend
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3005/api/tournament/list",
        );
        if (response.data.success) {
          setTeams(response.data.teams);
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // GSAP Animation: Triggers only after teams are loaded
  // useGSAP(
  //   () => {
  //     if (!loading && teams.length >= 0) {
  //       gsap.from(".header-anim", {
  //         y: -30,
  //         opacity: 0,
  //         duration: 0.8,
  //         ease: "power3.out",
  //       });

  //       gsap.from(".team-card", {
  //         y: 50,
  //         opacity: 0,
  //         duration: 0.6,
  //         stagger: 0.15,
  //         ease: "back.out(1.2)",
  //       });

  //       gsap.from(".action-btns", {
  //         y: 30,
  //         opacity: 0,
  //         duration: 0.6,
  //         delay: 0.5,
  //         ease: "power2.out",
  //       });
  //     }
  //   },
  //   { scope: container, dependencies: [teams, loading] },
  // );

  return (
    <section ref={container} className="py-32 bg-gray-900 min-h-screen">
      <div className="container mx-auto px-6">
        <h1 className="header-anim text-3xl font-bold text-center mb-12 text-purple-400">
          🏆 Registered Teams
        </h1>

        {loading ? (
          <div className="text-center text-purple-500 font-semibold text-xl animate-pulse">
            Loading teams from the database...
          </div>
        ) : teams.length === 0 ? (
          <p className="header-anim text-center text-gray-400 text-lg">
            No teams have registered yet. Be the first to join!
          </p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div
                key={team._id}
                className="team-card bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-700 transition-all transform hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-purple-500/50"
              >
                {/* Team Name */}
                <h2 className="text-2xl font-bold text-purple-400 mb-4 border-b border-gray-700 pb-2">
                  {team.teamName}
                </h2>

                {/* Captain Info */}
                <div className="space-y-3 text-gray-300">
                  <p className="flex items-center">
                    <span className="font-semibold text-white w-24">
                      👑 Captain:
                    </span>
                    <span className="text-gray-400">{team.captainName}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-semibold text-white w-24">
                      📧 Email:
                    </span>
                    <span
                      className="text-gray-400 truncate"
                      title={team.captainEmail}
                    >
                      {team.captainEmail}
                    </span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-semibold text-white w-24">
                      📞 Phone:
                    </span>
                    <span className="text-gray-400">{team.captainPhone}</span>
                  </p>
                </div>

                {/* Members */}
                {team.members && team.members.length > 0 ? (
                  <div className="mt-5">
                    <p className="font-semibold text-white mb-2">👥 Members:</p>
                    <div className="flex flex-wrap gap-2">
                      {team.members.map((member, index) => (
                        <span
                          key={index}
                          className="bg-gray-700/50 text-purple-300 px-3 py-1 rounded-full text-sm border border-gray-600"
                        >
                          {member}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-gray-500 italic">
                    No extra members listed
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-btns text-center mt-16 flex flex-col items-center space-y-4">
          <Link
            to="/tournament"
            className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] inline-block w-full max-w-xs"
          >
            📝 Register New Team
          </Link>
          <Link
            to="/"
            className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg text-white font-semibold transition-all transform hover:scale-105 shadow-md inline-block w-full max-w-xs"
          >
            🏠 Go Home
          </Link>
        </div>
      </div>
    </section>
  );
};

export default TournamentList;
