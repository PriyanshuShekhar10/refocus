export default function FeaturesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="mt-40 mx-32">{children}</div>;
}
