export function IngredientAliases({
  aliases,
  canonicalName,
}: {
  aliases: string[];
  canonicalName: string;
}) {
  const names = [...new Set(aliases)].filter(
    (name) => name.toLocaleLowerCase() !== canonicalName.toLocaleLowerCase(),
  );
  if (!names.length)
    return <p className="muted text-sm">Belum ada nama lain yang tercatat.</p>;
  return (
    <div className="alias-list">
      <p className="muted text-sm mb-0">
        Nama lain: {names.slice(0, 3).join(", ")}
      </p>
      {names.length > 3 && (
        <details>
          <summary className="text-sm">
            Lihat {names.length - 3} nama lainnya
          </summary>
          <p className="alias-overflow muted text-sm" tabIndex={0}>
            {names.slice(3).join(", ")}
          </p>
        </details>
      )}
    </div>
  );
}
