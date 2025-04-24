import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Spinner } from "./Spinner";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";

interface VotingFormProps {
  ballotId: number;
  proposalNames: string[];
}

export const VotingForm = ({ ballotId, proposalNames }: VotingFormProps) => {
  const { address, isConnected } = useAccount();
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [merkleProof, setMerkleProof] = useState<`0x${string}`[]>([]);
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has already voted
  const { data: hasVoted } = useScaffoldReadContract({
    contractName: "BallotFactory",
    functionName: "hasVoted",
    args: [BigInt(ballotId), address],
  });

  // Set up vote function
  const { writeContractAsync, isPending } = useScaffoldWriteContract({
    contractName: "BallotFactory",
  });
  
  const handleVote = async () => {
    if (selectedProposal === null) {
      setError("Please select a proposal");
      return;
    }
  
    try {
      await writeContractAsync({
        functionName: "vote",
        args: [
          BigInt(ballotId),
          BigInt(selectedProposal),
          merkleProof,
        ],
      });
  
      setSelectedProposal(null); // Clear selection on success
    } catch (e) {
      console.error("Vote failed:", e);
      setError("Failed to submit vote");
    }
  };
  
  

  // Fetch Merkle proof when address changes
  useEffect(() => {
    const fetchProof = async () => {
      if (!address || !isConnected) {
        setIsEligible(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/merkle/proof/${ballotId}/${address}`);
        const data = await response.json();

        if (data.success && data.data.isWhitelisted) {
          setMerkleProof(data.data.proof);
          setIsEligible(true);
        } else {
          setIsEligible(false);
        }
      } catch (err) {
        console.error("Error fetching proof:", err);
        setError("Failed to check eligibility");
        setIsEligible(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProof();
  }, [address, ballotId, isConnected]);


  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <div className="p-5 text-center">
          <p className="mb-4">Please connect your wallet to vote</p>
        </div>
      </Card>
    );
  }

  if (hasVoted) {
    return (
      <Card>
        <div className="p-5 text-center">
          <p className="text-success mb-2">You have already voted in this ballot</p>
          <p>Thank you for participating!</p>
        </div>
      </Card>
    );
  }

  if (!isEligible) {
    return (
      <Card>
        <div className="p-5 text-center">
          <p className="text-error mb-2">Your address is not eligible to vote in this ballot</p>
          <p>Only whitelisted addresses can participate</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-5">
        <h3 className="text-xl font-bold mb-4">Cast Your Vote</h3>
        
        {error && <p className="text-error mb-4">{error}</p>}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Proposal</label>
          <div className="grid gap-3">
            {proposalNames.map((name, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-accent hover:bg-opacity-10 transition-colors ${
                  selectedProposal === index ? "border-primary bg-accent bg-opacity-10" : "border-base-300"
                }`}
                onClick={() => setSelectedProposal(index)}
              >
                <p className="font-medium">{name}</p>
              </div>
            ))}
          </div>
        </div>
        
        <Button
  className="w-full"
  onClick={handleVote}
  disabled={selectedProposal === null || isPending}
>
  {isPending ? <Spinner size="sm" className="mr-2" /> : null}
  {isPending ? "Submitting..." : "Cast Vote"}
</Button>

      </div>
    </Card>
  );
};