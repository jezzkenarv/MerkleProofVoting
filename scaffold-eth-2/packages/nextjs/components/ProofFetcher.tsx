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