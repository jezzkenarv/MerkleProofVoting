import { useEffect, useState } from "react";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { MetaHeader } from "~~/components/MetaHeader";
import { ResultsDisplay } from "~~/components/ResultsDisplay";
import { Spinner } from "~~/components/Spinner";
import { Card } from "~~/components/Card";
import { Button } from "~~/components/Button";

interface ResultsPageProps {
  ballotId: number;
}

const ResultsPage = ({ ballotId }: ResultsPageProps) => {
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
        const response = await fetch(`/api/merkle/ballot/${ballotId}/results`);
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
        <Button onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <>
      <MetaHeader title={`Results - Ballot #${ballotId}`} description="View voting results" />
      
      <div className="container mx-auto px-6 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold">Ballot #{ballotId} Results</h1>
              <p className="text-xl mt-2 text-base-content opacity-80">
                View detailed voting results
              </p>
            </div>
            <div className="flex gap-3">
              <Link href={`/ballots/${ballotId}`} passHref>
                <Button className="btn-outline">
                  Back to Ballot
                </Button>
              </Link>
              <Link href="/" passHref>
                <Button className="btn-outline">
                  All Ballots
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3">
              <ResultsDisplay 
                proposalNames={proposalNames || []} 
                voteCounts={ballot.voteCounts || []}
              />
            </div>

            <div className="md:col-span-2">
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Ballot Information</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm opacity-70">Status</h3>
                    <p className="font-medium">
                      {ballot.isActive ? 
                        <span className="text-success">Active</span> : 
                        <span className="text-error">Closed</span>
                      }
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm opacity-70">Whitelist</h3>
                    <p className="font-medium">{ballot.whitelistCount} addresses</p>
                  </div>
                  <div>
                    <h3 className="text-sm opacity-70">Total Votes</h3>
                    <p className="font-medium">
                      {ballot.voteCounts.reduce((sum: number, count: number) => sum + count, 0)} votes cast
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm opacity-70">Participation Rate</h3>
                    <p className="font-medium">
                      {ballot.whitelistCount > 0 
                        ? `${Math.round((ballot.voteCounts.reduce((sum: number, count: number) => sum + count, 0) / ballot.whitelistCount) * 100)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                </div>
              </Card>
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

export default ResultsPage;