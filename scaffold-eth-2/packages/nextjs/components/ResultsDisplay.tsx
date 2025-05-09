// Component designed to visualize the voting results from the ballot system 
// Takes in 2 props:
// proposalNames: An array of strings representing the names of the proposals
// voteCounts: An array of numbers representing the votes each proposal received
// With the votes: Calculates the total number of votes cast, determines the winning proposal, and calculates the percentage of total votes for each proposal
// UI: shows a msg when no votes have been cast and displays voting statistics when there are votes present
// Visually: Creates a progress bar for each proposal, the width of each bar corresponds to the percentage of votes received, highlights the winning proposal with a different color (primary vs. secondary)


import { Card } from "./Card";

interface ResultsDisplayProps {
  proposalNames: string[];
  voteCounts: number[];
}

export const ResultsDisplay = ({ proposalNames, voteCounts }: ResultsDisplayProps) => {
  // Calculate total votes and percentages
  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);
  
  // Find winning proposal
  let winningIndex = -1;
  let maxVotes = -1;
  
  voteCounts.forEach((count, index) => {
    if (count > maxVotes) {
      maxVotes = count;
      winningIndex = index;
    }
  });

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Voting Results</h2>
      
      {totalVotes === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500">No votes have been cast yet</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-lg font-medium">Total Votes: {totalVotes}</p>
            {winningIndex >= 0 && (
              <p className="text-lg font-medium mt-2">
                Current Leader: <span className="text-primary">{proposalNames[winningIndex]}</span>
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            {proposalNames.map((name, index) => {
              const voteCount = voteCounts[index];
              const percentage = totalVotes ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isWinning = index === winningIndex && totalVotes > 0;
              
              return (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{name}</span>
                    <span>{voteCount} votes ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${isWinning ? 'bg-primary' : 'bg-secondary'}`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};