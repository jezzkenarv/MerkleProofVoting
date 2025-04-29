// Component that is responsible for checking whether a user is eligible to vote in a specific ballot by fetching their merkle proofs from an API endpoint
// Fetch a user's Merkle proof for a specific ballot
// Determine if they're eligible to vote
// Display appropriate feedback based on their status
// Pass the proof data back to its parent component

// Props: 
// ballotId: The ID of the ballot to check eligibility for
// onProofFetched: A callback function that returns the proof data and eligibility status to the parent component

// useAccount (Wagmi): accesses the user's blockchain wallet address and connection status

// API Integration:
// Makes a request to API endpoint (/api/merkle/proof/${ballotId}/${address})
// This endpoint checks if the user's address is in the Merkle tree for the specified ballot
// Returns a proof array if the user is whitelisted

// State management:
// Tracks loading state during API calls
// Manages error messages
// Maintains the user's eligibility status ("eligible", "not-eligible", or "unknown")

// When proof data is received, the component calls onProofFetched to pass the data back to its parent
// This allows the parent component (VotingForm) to use the proof data when submitting votes



import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Spinner } from "./Spinner";
import { Card } from "./Card";

interface ProofFetcherProps {
  ballotId: number;
  onProofFetched: (proof: string[], isEligible: boolean) => void;
}

export const ProofFetcher = ({ ballotId, onProofFetched }: ProofFetcherProps) => {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityStatus, setEligibilityStatus] = useState<"eligible" | "not-eligible" | "unknown">("unknown");

  useEffect(() => {
    const fetchProof = async () => {
      if (!address || !isConnected) {
        setEligibilityStatus("unknown");
        onProofFetched([], false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/merkle/proof/${ballotId}/${address}`);

        const data = await response.json();

        if (data.success && data.data) {
          const isEligible = data.data.isWhitelisted;
          setEligibilityStatus(isEligible ? "eligible" : "not-eligible");
          onProofFetched(data.data.proof, isEligible);
        } else {
          setEligibilityStatus("not-eligible");
          setError(data.message || "Failed to verify eligibility");
          onProofFetched([], false);
        }
      } catch (err) {
        console.error("Error fetching proof:", err);
        setError("Failed to check eligibility");
        setEligibilityStatus("unknown");
        onProofFetched([], false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProof();
  }, [address, ballotId, isConnected, onProofFetched]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p>Checking eligibility...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-error">
          <p>Error: {error}</p>
        </div>
      </Card>
    );
  }

  if (eligibilityStatus === "eligible") {
    return (
      <Card className="p-4 bg-success bg-opacity-10 border-success">
        <div className="text-success text-center">
          <p className="font-bold">✓ You are eligible to vote</p>
          <p className="text-sm">Your wallet address is on the whitelist</p>
        </div>
      </Card>
    );
  }

  if (eligibilityStatus === "not-eligible") {
    return (
      <Card className="p-4 bg-error bg-opacity-10 border-error">
        <div className="text-error text-center">
          <p className="font-bold">✗ You are not eligible to vote</p>
          <p className="text-sm">Your wallet address is not on the whitelist</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="text-center">
        <p>Connect your wallet to check eligibility</p>
      </div>
    </Card>
  );
};