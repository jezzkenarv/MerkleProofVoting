import Head from "next/head";

interface MetaHeaderProps {
  title?: string;
  description?: string;
  image?: string;
}

export const MetaHeader = ({
  title = "Merkle Proof Voting",
  description = "A secure voting system using Merkle tree verification",
  image = "/thumbnail.png",
}: MetaHeaderProps) => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
    </Head>
  );
};