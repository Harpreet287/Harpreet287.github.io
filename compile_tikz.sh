#!/usr/bin/env bash
set -euo pipefail

# Compile specific TikZ/LaTeX figure files you pass as args.
#
# Outputs (next to each .tex by default):
# - <name>.pdf  (always)
# - <name>.png  (always, if a rasterizer exists)
#
# It also cleans up LaTeX aux files so only .tex/.pdf/.png remain.
#
# Usage:
#   ./compile_tikz.sh path/to/figure.tex [more.tex ...]
#
# Optional env:
#   TIKZ_DPI=300   # PNG resolution

export PATH="/Library/TeX/texbin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:${PATH}"
export LC_ALL="C"
export LANG="C"

die() { printf "error: %s\n" "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing dependency '$1' (not found in PATH)"
}

need_cmd latexmk
need_cmd pdflatex

TIKZ_DPI="${TIKZ_DPI:-300}"

to_png() {
  local pdf="$1"
  local png="$2"

  if command -v gs >/dev/null 2>&1; then
    gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=pngalpha -r"${TIKZ_DPI}" -o "$png" "$pdf" >/dev/null
    return 0
  fi

  if command -v magick >/dev/null 2>&1; then
    magick -density "${TIKZ_DPI}" "$pdf" -quality 100 "$png" >/dev/null
    return 0
  fi

  if command -v sips >/dev/null 2>&1; then
    sips -s format png "$pdf" --out "$png" >/dev/null
    return 0
  fi

  return 1
}

cleanup_aux() {
  local dir="$1"
  local stem="$2"

  # latexmk state + common LaTeX aux files
  rm -f \
    "${dir}/${stem}.aux" \
    "${dir}/${stem}.log" \
    "${dir}/${stem}.fls" \
    "${dir}/${stem}.fdb_latexmk" \
    "${dir}/${stem}.out" \
    "${dir}/${stem}.toc" \
    "${dir}/${stem}.lof" \
    "${dir}/${stem}.lot" \
    "${dir}/${stem}.nav" \
    "${dir}/${stem}.snm" \
    "${dir}/${stem}.synctex.gz" \
    "${dir}/${stem}.dvi" \
    "${dir}/${stem}.ps" \
    "${dir}/${stem}.bbl" \
    "${dir}/${stem}.blg" \
    "${dir}/${stem}.bcf" \
    "${dir}/${stem}.run.xml" \
    "${dir}/${stem}.xdv"
}

compile_one() {
  local tex="$1"
  [[ -f "$tex" ]] || die "file not found: $tex"
  [[ "$tex" == *.tex ]] || die "not a .tex file: $tex"

  local dir base stem pdf png
  dir="$(cd "$(dirname "$tex")" && pwd)"
  base="$(basename "$tex")"
  stem="${base%.tex}"
  pdf="${dir}/${stem}.pdf"
  png="${dir}/${stem}.png"

  printf "compile: %s\n" "$tex"

  (
    cd "$dir"
    if grep -q '\\documentclass' "$base"; then
      latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error "$base" >/dev/null
    else
      # Snippet mode: wrap a tikzpicture-only file in a tiny standalone document.
      local wrap=".tikzwrap-${stem}.tex"
      cat >"$wrap" <<EOF
\\documentclass[tikz,border=2pt]{standalone}
\\usepackage{tikz}
\\usetikzlibrary{positioning,arrows.meta}
\\begin{document}
\\input{${base}}
\\end{document}
EOF
      latexmk -pdf -jobname="$stem" -interaction=nonstopmode -halt-on-error -file-line-error "$wrap" >/dev/null
      rm -f "$wrap" ".tikzwrap-${stem}.fdb_latexmk" ".tikzwrap-${stem}.fls" ".tikzwrap-${stem}.log" ".tikzwrap-${stem}.aux"
    fi
  )

  if [[ ! -f "$pdf" ]]; then
    die "expected output missing: $pdf"
  fi

  if to_png "$pdf" "$png"; then
    printf "  ok: %s\n" "$png"
  else
    die "couldn't generate PNG for: $pdf (need 'gs' or another rasterizer)"
  fi

  cleanup_aux "$dir" "$stem"
}

if [[ "$#" -lt 1 ]]; then
  die "usage: ./compile_tikz.sh path/to/figure.tex [more.tex ...]"
fi

for tex in "$@"; do
  compile_one "$tex"
done
