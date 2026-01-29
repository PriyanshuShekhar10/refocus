
export function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-4 top-4 z-[100] rounded-md bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
      {message}
    </div>
  );
}
