import { useEffect, useState } from "react";
import Link from "next/link";
import { MetaHeader } from "~~/components/MetaHeader";
import { Card } from "~~/components/Card";
import { Spinner } from "~~/components/Spinner";

interface Ballot {
  id: number;
  proposalNames: string[];
  whitelistCount: number;
}

export default function Home() {
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBallots = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/merkle/ballots`);


        const result = await response.json();
        
        if (result.success) {
          setBallots(result.data || []);
        } else {
          setError(result.message || "Failed to load ballots");
        }
      } catch (err) {
        console.error("Error fetching ballots:", err);
        setError("Failed to load ballots");
      } finally {
        setLoading(false);
      }
    };

    fetchBallots();
  }, []);

  return (
    <>
      <MetaHeader />
      
      <div className="flex flex-col items-center pt-10 pb-16">
        <h1 className="text-4xl font-bold mb-2">Merkle Proof Voting</h1>
        <p className="text-xl opacity-80 mb-10">Secure and efficient voting using Merkle trees</p>
        
        {loading ? (
          <div className="py-10">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-error text-center p-4">
            <p>{error}</p>
          </div>
        ) : (
          <div className="w-full max-w-5xl px-4">
            {ballots.length === 0 ? (
              <div className="text-center p-10">
                <p className="text-xl mb-4">No ballots available</p>
                <p className="opacity-80">Check back later for active voting opportunities</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {ballots.map(ballot => (
                  <Link key={ballot.id} href={`/ballots/${ballot.id}`} passHref>
                    <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden">
                      <div className="p-6">
                        <h2 className="text-2xl font-bold mb-2">Ballot #{ballot.id}</h2>
                        <div className="mb-4 text-sm opacity-75">
                          <p>{ballot.whitelistCount} whitelisted addresses</p>
                          <p>{ballot.proposalNames.length} proposals</p>
                        </div>
                        <div className="mt-4">
                          <h3 className="font-medium mb-2">Proposals:</h3>
                          <ul className="list-disc pl-5">
                            {ballot.proposalNames.slice(0, 3).map((name, i) => (
                              <li key={i} className="truncate">{name}</li>
                            ))}
                            {ballot.proposalNames.length > 3 && (
                              <li>+{ballot.proposalNames.length - 3} more...</li>
                            )}
                          </ul>
                        </div>
                      </div>
                      <div className="bg-base-200 px-6 py-3 text-right">
                        <span className="font-medium">View Ballot →</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}