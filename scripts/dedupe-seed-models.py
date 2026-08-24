#!/usr/bin/env python3
"""
Removes spelling duplicates from `vehicle_models` in a seed file and remaps
`ads.model_id` to the kept row.

Two model names of the same brand are duplicates when their normalized key
matches (same rule as the `normalized_name` generated column in the schema:
accents stripped, uppercased, everything but A-Z0-9+ removed). The row with
the lowest id is kept.

Usage: python3 scripts/dedupe-seed-models.py packages/db/supabase/seed.sql [...]
"""
import re
import sys
import unicodedata


def normalize_key(value: str) -> str:
    value = unicodedata.normalize("NFD", value)
    value = "".join(c for c in value if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Z0-9+]", "", value.upper())


def find_insert(sql: str, table: str):
    """Returns (header_start, values_start, end) of the INSERT for `table`."""
    match = re.search(
        rf'INSERT INTO "public"\."{table}" \(([^)]*)\) VALUES\n', sql
    )
    if not match:
        return None
    columns = [c.strip().strip('"') for c in match.group(1).split(",")]
    return match.start(), match.end(), columns


def parse_tuples(sql: str, start: int):
    """
    Parses `(...),\n(...),\n...(...);` starting at `start`.
    Returns (list of (tuple_start, tuple_end, fields), end_of_statement).
    Fields are raw SQL literals (quotes preserved).
    """
    i = start
    tuples = []
    n = len(sql)
    while i < n:
        # skip whitespace
        while i < n and sql[i] in " \t\n":
            i += 1
        if sql[i] != "(":
            raise ValueError(f"expected '(' at {i}")
        t_start = i
        i += 1
        fields, current, depth, in_quote = [], [], 0, False
        while i < n:
            c = sql[i]
            if in_quote:
                current.append(c)
                if c == "'":
                    if i + 1 < n and sql[i + 1] == "'":
                        current.append("'")
                        i += 1
                    else:
                        in_quote = False
            elif c == "'":
                in_quote = True
                current.append(c)
            elif c == "(":
                depth += 1
                current.append(c)
            elif c == ")" and depth > 0:
                depth -= 1
                current.append(c)
            elif c == ")":
                fields.append("".join(current).strip())
                i += 1
                break
            elif c == ",":
                fields.append("".join(current).strip())
                current = []
            else:
                current.append(c)
            i += 1
        tuples.append((t_start, i, fields))
        # after tuple: ',' or ';'
        while i < n and sql[i] in " \t\n":
            i += 1
        if sql[i] == ";":
            return tuples, i + 1
        if sql[i] != ",":
            raise ValueError(f"expected ',' or ';' at {i}")
        i += 1
    raise ValueError("unterminated INSERT")


def unquote(literal: str) -> str:
    return literal[1:-1].replace("''", "'")


def dedupe(path: str) -> None:
    sql = open(path, encoding="utf-8").read()

    models = find_insert(sql, "vehicle_models")
    if not models:
        print(f"{path}: no vehicle_models insert, skipped")
        return
    _, values_start, columns = models
    id_idx, brand_idx, name_idx = (
        columns.index("id"),
        columns.index("brand_id"),
        columns.index("name"),
    )
    tuples, stmt_end = parse_tuples(sql, values_start)

    kept_by_key: dict[tuple[str, str], int] = {}
    remap: dict[int, int] = {}
    removed = []
    for t_start, t_end, fields in tuples:
        model_id = int(fields[id_idx])
        key = (fields[brand_idx], normalize_key(unquote(fields[name_idx])))
        if key in kept_by_key:
            remap[model_id] = kept_by_key[key]
            removed.append((t_start, t_end, unquote(fields[name_idx])))
        else:
            kept_by_key[key] = model_id

    if not remap:
        print(f"{path}: no duplicates")
        return

    # Rebuild the vehicle_models statement without the removed tuples
    kept_tuples = [
        sql[t_start:t_end]
        for t_start, t_end, _ in tuples
        if not any(t_start == r[0] for r in removed)
    ]
    new_models_stmt = ",\n".join("\t" + t for t in kept_tuples) + ";"
    sql = sql[:values_start] + new_models_stmt + sql[stmt_end:]

    # Remap ads.model_id
    ads = find_insert(sql, "ads")
    remapped = 0
    if ads:
        _, ads_values_start, ads_columns = ads
        model_idx = ads_columns.index("model_id")
        ads_tuples, ads_end = parse_tuples(sql, ads_values_start)
        rebuilt = []
        for _, _, fields in ads_tuples:
            literal = fields[model_idx]
            if literal.isdigit() and int(literal) in remap:
                fields[model_idx] = str(remap[int(literal)])
                remapped += 1
            rebuilt.append("\t(" + ", ".join(fields) + ")")
        sql = sql[:ads_values_start] + ",\n".join(rebuilt) + ";" + sql[ads_end:]

    open(path, "w", encoding="utf-8").write(sql)
    print(
        f"{path}: removed {len(remap)} duplicate model(s), remapped {remapped} ad(s)"
    )
    for _, _, name in removed:
        print(f"  - {name}")


if __name__ == "__main__":
    for seed_path in sys.argv[1:]:
        dedupe(seed_path)
