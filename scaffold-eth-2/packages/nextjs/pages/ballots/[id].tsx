// Ballot details
import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { VotingForm } from "~~/components/VotingForm";
import { Spinner } from "~~/components/Spinner";
import { MetaHeader } from "~~/components/MetaHeader";

interface BallotDetailsProps {
  ballotId: number;
}

const BallotDetails = ({ ballotId }: BallotDetailsProps) => {
  const router = useRouter();
  const [ballot, setBallot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get proposal names directly from contract
  const { data: proposalNames } = useScaffoldReadContract({
    contractName: "BallotFactory",
    functionName: "getProposalNames",
    args: [BigInt(ballotId)],
  });

  // Fetch ballot details from API
  useEffect(() => {
    const fetchBallot = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/merkle/ballot/${ballotId}`);
        const result = await response.json();
        
        if (result.success) {
          setBallot(result.data);
        } else {
          setError(result.message || "Failed to load ballot");
        }
      } catch (err) {
        console.error("Error fetching ballot:", err);
        setError("Failed to load ballot details");
      } finally {
        setLoading(false);
      }
    };

    fetchBallot();
  }, [ballotId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  if (error || !ballot) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-5">
        <h1 className="text-3xl mb-6">Error</h1>
        <p className="text-error mb-4">{error || "Failed to load ballot"}</p>
        <button 
          className="btn btn-primary" 
          onClick={() => router.push("/")}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <>
      <MetaHeader title={`Ballot #${ballotId}`} description="Vote in a whitelisted ballot" />
      
      <div className="container mx-auto px-6 py-10">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-4xl font-bold">Ballot #{ballotId}</h1>
            <p className="text-xl mt-2 text-base-content opacity-80">
              Cast your vote if you're whitelisted
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3">
              <div className="bg-base-100 p-6 rounded-xl shadow-sm">
                <h2 className="text-2xl font-bold mb-4">Proposals</h2>
                {proposalNames && proposalNames.length > 0 ? (
                  <div className="divide-y">
                    {proposalNames.map((name, index) => (
                      <div key={index} className="py-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">{name}</h3>
                          <span className="badge badge-primary">
                            {ballot.voteCounts[index] || 0} votes
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No proposals found</p>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <VotingForm 
                ballotId={ballotId} 
                proposalNames={proposalNames || []} 
              />
              
              <div className="mt-6 bg-base-100 p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">Ballot Info</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm opacity-70">Status</p>
                    <p className="font-medium">
                      {ballot.isActive ? 
                        <span className="text-success">Active</span> : 
                        <span className="text-error">Closed</span>
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm opacity-70">Whitelist</p>
                    <p className="font-medium">{ballot.whitelistCount} addresses</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button 
                    className="btn btn-outline btn-sm w-full"
                    onClick={() => router.push(`/ballots/${ballotId}/results`)}
                  >
                    View Detailed Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const ballotId = context.params?.id;
  
  if (!ballotId || Array.isArray(ballotId) || isNaN(parseInt(ballotId))) {
    return {
      notFound: true,
    };
  }
  
  return {
    props: {
      ballotId: parseInt(ballotId),
    },
  };
};

export default BallotDetails;