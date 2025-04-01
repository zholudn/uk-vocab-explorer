import pandas as pd
import re

# Load the CSV
df = pd.read_csv("public/lemma_summary.csv")

# Clean function: remove "Казки Лірника Сашка." with or without a space after
def clean_story_name(name):
    return re.sub(r'Казки Лірника Сашка\. ?', '', name)

# --- Clean the column names (only those that start with "count_in_")
new_columns = {}
for col in df.columns:
    if col.startswith("count_in_"):
        original_name = col[len("count_in_"):]
        cleaned_name = clean_story_name(original_name)
        new_col_name = f"count_in_{cleaned_name}"
        new_columns[col] = new_col_name

df = df.rename(columns=new_columns)

# --- Clean the 'first_story' column
if 'first_story' in df.columns:
    df['first_story'] = df['first_story'].apply(clean_story_name)

# Save the cleaned CSV
df.to_csv("public/lemma_summary_cleaned.csv", index=False)
print("✅ Saved cleaned CSV as public/lemma_summary_cleaned.csv")

