interface Props {
  message?: string;
}

export function TableErrorState({
  message = "Could not load data. Please try again.",
}: Props) {
  return <div className="p-6 text-destructive">{message}</div>;
}
