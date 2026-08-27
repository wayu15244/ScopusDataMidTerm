# -*- coding: utf-8 -*-
"""
scopus_eda_analysis.py
โครงงานการวิเคราะห์ข้อมูลเชิงสำรวจ (Exploratory Data Analysis - EDA)
วิชา EDA - Scopus Data (สอบ Midterm)
อาจารย์ผู้สอน: ผู้ช่วยศาสตราจารย์ ดร.โอฬาริก สุรินต๊ะ

สมาชิกกลุ่ม:
1. นายณัฐวุฒิ พละศักดิ์  67011211017
2. นายพงศกร ไชยรงศรี  67011211039
3. นายอนุรักษ์ งามจันอัด  67011211062
4. นายปภังกร กุศล      67011211035
"""

import os
import sys
import re

# รองรับการแสดงผลภาษาไทยบน Windows Terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import pandas as pd
import numpy as np
from sklearn.preprocessing import normalize
from sklearn.feature_extraction.text import TfidfVectorizer

print("="*70)
print("  กระบวนการ EDA และเตรียมคุณลักษณะข้อมูล Scopus 10 สาขาวิชา")
print("="*70)

# 1. โหลดข้อมูลดิบ
raw_path = os.path.join("data", "scopus_10subjects_raw.csv")
print(f"\n[1] กำลังโหลดข้อมูลดิบจาก: {raw_path}")
df_raw = pd.read_csv(raw_path)
print(f" -> จำนวนแถวข้อมูลดิบทั้งหมด: {len(df_raw):,} รายการ, จำนวนคอลัมน์: {len(df_raw.columns)} คอลัมน์")

# ตรวจสอบจำนวนต่อสาขาวิชา
print("\nจำนวนข้อมูลดิบแยกตาม 10 สาขาวิชา (Subject Area):")
print(df_raw["Subject"].value_counts())

# 2. ตรวจสอบความซ้ำซ้อนของข้อมูล (Deduplication)
# กฎ: 1 บทความอยู่ได้เพียง 1 Subject เท่านั้น หากพบชื่อบทความซ้ำกันข้ามสาขาให้ตัดรายการซ้ำออก
print("\n[2] ตรวจสอบและขจัดข้อมูลซ้ำซ้อน (Deduplication)...")
initial_count = len(df_raw)
df_dedup = df_raw.drop_duplicates(subset=["Title"], keep="first").copy()
n_dups = initial_count - len(df_dedup)
print(f" -> ตรวจพบบทความซ้ำซ้อนข้ามสาขา: {n_dups} รายการ (ตัดออกคงเหลือ {len(df_dedup):,} รายการ)")

# 3. ตรวจสอบและกรองข้อมูลที่ไม่เกี่ยวข้อง (Data Cleaning)
print("\n[3] ตรวจสอบและกรองข้อมูลที่ไม่เกี่ยวข้อง (Irrelevant & Language Filter)...")
# กรองภาษาอื่นที่ไม่ใช่ภาษาอังกฤษ
df_clean = df_dedup[df_dedup["Language of Original Document"] == "English"].copy()
n_lang = len(df_dedup) - len(df_clean)
print(f" -> คัดกรองบทความภาษาอื่นที่ไม่ใช่ภาษาอังกฤษ: {n_lang} รายการ")

# กรองบทความที่ขาดบทคัดย่อ (Missing Abstracts)
df_clean = df_clean[df_clean["Abstract"].str.strip().str.len() >= 40].copy()

# กรองบทความนอกศาสตร์คอมพิวเตอร์ที่หลุดเข้ามาจากการสืบค้น
irrel_pattern = r"(?i)\b(?:real estate|price index|property valuation|dubai market|tourism management|hospitality industry|dental implants|osseointegration|winter wheat|crop yield|hotel booking|dental prosthesis)\b"
is_irrel = df_clean["Title"].str.contains(irrel_pattern, na=False, regex=True) | df_clean["Abstract"].str.contains(irrel_pattern, na=False, regex=True)
n_irrel = int(is_irrel.sum())
df_clean = df_clean[~is_irrel].copy()
print(f" -> คัดกรองบทความนอกบริบทวิทยาการคอมพิวเตอร์: {n_irrel} รายการ")

cleaned_path = os.path.join("data", "scopus_10subjects_cleaned.csv")
df_clean.to_csv(cleaned_path, index=False, encoding="utf-8-sig")
print(f" -> บันทึกชุดข้อมูลสะอาด: {cleaned_path} ({len(df_clean):,} รายการ)")

print("\nสรุปจำนวนบทความสะอาดต่อสาขาวิชา (เกณฑ์ขั้นต่ำ >= 600 รายการ):")
for subj, count in df_clean["Subject"].value_counts().items():
    print(f"  - {subj}: {count:,} รายการ (ผ่านเกณฑ์: {count >= 600})")

# 4. สถิติเชิงพรรณนา (Descriptive Statistics)
print("\n[4] สรุปสถิติเชิงพรรณนาที่สำคัญ:")
print(f"  - จำนวนการอ้างอิงเฉลี่ย (Mean Citations): {df_clean['Cited by'].mean():.2f} ครั้ง")
print(f"  - จำนวนการอ้างอิงมัธยฐาน (Median Citations): {df_clean['Cited by'].median():.1f} ครั้ง")
print(f"  - จำนวนการอ้างอิงสูงสุด (Max Citations): {df_clean['Cited by'].max():,} ครั้ง")
print(f"  - ช่วงปีที่ตีพิมพ์: {df_clean['Year'].min()} ถึง {df_clean['Year'].max()}")

# 5. การเตรียมข้อมูลสำหรับ Text Embedding / Feature Vector
print("\n[5] สร้างข้อความรวม (Title + Abstract + Keywords) สำหรับโมเดลภาษา...")
def combine_text(row):
    parts = []
    if pd.notna(row.get("Title")) and str(row["Title"]).strip():
        parts.append(f"Title: {str(row['Title']).strip()}")
    if pd.notna(row.get("Abstract")) and str(row["Abstract"]).strip():
        parts.append(f"Abstract: {str(row['Abstract']).strip()}")
    if pd.notna(row.get("Author Keywords")) and str(row["Author Keywords"]).strip():
        parts.append(f"Author keywords: {str(row['Author Keywords']).strip()}")
    if pd.notna(row.get("Index Keywords")) and str(row["Index Keywords"]).strip():
        parts.append(f"Index keywords: {str(row['Index Keywords']).strip()}")
    return "\n".join(parts)

df_clean["embedding_text"] = df_clean.apply(combine_text, axis=1)

# คำนวณความยาวโทเค็นและการตัดทิ้งที่ 512 โทเค็น (SPECTER2 Limit)
df_clean["estimated_tokens"] = (df_clean["embedding_text"].apply(lambda t: len(t.split())) * 1.3).astype(int)
pct_trunc = (df_clean["estimated_tokens"] > 512).sum() / len(df_clean) * 100
print(f"  - ความยาวโทเค็นเฉลี่ย: {df_clean['estimated_tokens'].mean():.1f} โทเค็น")
print(f"  - สัดส่วนบทความที่เกิน 512 โทเค็น (SPECTER2 Truncation): {pct_trunc:.2f}%")

# 6. การสร้าง Dense Representation และ L2 Normalization
print("\n[6] จำลองการสกัดเวกเตอร์คุณลักษณะ 768 มิติ และ L2 Normalization...")
tfidf = TfidfVectorizer(max_features=768, stop_words="english")
tfidf_mat = tfidf.fit_transform(df_clean["embedding_text"]).toarray()
proj = np.random.randn(tfidf_mat.shape[1], 768) * 0.1
embeddings = np.dot(tfidf_mat, proj)

# ทำ L2 Normalization (v / ||v||_2)
embeddings_normalized = normalize(embeddings, norm="l2")
print(f"  - ขนาดมิติของ Feature Vector: {embeddings_normalized.shape}")
print(f"  - ตรวจสอบขนาดเวกเตอร์หลัง L2 Norm (||v||_2): {np.linalg.norm(embeddings_normalized[0]):.4f}")

print("\n" + "="*70)
print("  การประมวลผลข้อมูลและเตรียมความพร้อมสำหรับ Machine Learning เสร็จสมบูรณ์!")
print("="*70)
