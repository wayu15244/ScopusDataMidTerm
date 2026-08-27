# โครงงานการวิเคราะห์ข้อมูลเชิงสำรวจ (EDA) — ชุดข้อมูลวิชาการ Scopus 10 สาขาวิชา

**วิชา:** การวิเคราะห์ข้อมูลเชิงสำรวจ (Exploratory Data Analysis - EDA)  
**งานสอบกลางภาค (Midterm Examination):** Project-Based Examination (คะแนนเต็ม 20 คะแนน)  
**อาจารย์ผู้สอน:** ผู้ช่วยศาสตราจารย์ ดร.โอฬาริก สุรินต๊ะ  
**ภาคการศึกษาที่ 1 ปีการศึกษา 2569**  

---

## สมาชิกกลุ่มผู้จัดทำ
1. **นายณัฐวุฒิ พละศักดิ์** รหัสนิสิต 67011211017
2. **นายพงศกร ไชยรงศรี** รหัสนิสิต 67011211039
3. **นายอนุรักษ์ งามจันอัด** รหัสนิสิต 67011211062
4. **นายปภังกร กุศล** รหัสนิสิต 67011211035

---

## ลิงก์สำหรับเข้าชมผลงานออนไลน์ (Interactive Visualization Dashboard)
🌐 **เข้าชมแพลตฟอร์มการแสดงผลข้อมูลด้วยภาพแบบโต้ตอบออนไลน์ได้ที่:**  
👉 **[https://wayu15244.github.io/ScopusDataMidTerm/](https://wayu15244.github.io/ScopusDataMidTerm/)**  
*(หรือเปิดไฟล์ `docs/index.html` บนเว็บเบราว์เซอร์ได้ทันที มีไลบรารี ECharts บรรจุในตัว สามารถทำงานแบบ Offline ได้ 100%)*

---

## สรุปภาพรวมของโครงงาน (Project Overview)

โครงงานนี้มุ่งเน้นการสืบค้น วิเคราะห์เชิงสำรวจ (EDA) และเตรียมคุณลักษณะ (Feature Engineering) ข้อมูลงานวิจัยทางวิทยาการคอมพิวเตอร์ (Computer Science) จากฐานข้อมูลวิชาการระดับสากล **Scopus** ครอบคลุม 10 สาขาวิชาย่อย (Subject Areas) เพื่อเข้าใจโครงสร้างความสัมพันธ์ของคำสำคัญ ความเชื่อมโยงข้ามศาสตร์ และเตรียมความพร้อมของข้อมูลสำหรับนำไปฝึกฝนโมเดล Machine Learning ในการสกัดเวกเตอร์ความหมาย (Text Embedding) ด้วยโมเดล SPECTER2

### 10 สาขาวิชาที่ทำการรวบรวมและวิเคราะห์ (Computer Science)
1. **Artificial Intelligence** (ข้อมูลสะอาด 697 รายการ)
2. **Computational Theory and Mathematics** (ข้อมูลสะอาด 699 รายการ)
3. **Computer Graphics and Computer-Aided Design** (ข้อมูลสะอาด 702 รายการ)
4. **Computer Networks and Communications** (ข้อมูลสะอาด 690 รายการ)
5. **Computer Vision and Pattern Recognition** (ข้อมูลสะอาด 704 รายการ)
6. **Hardware and Architecture** (ข้อมูลสะอาด 692 รายการ)
7. **Human-Computer Interaction** (ข้อมูลสะอาด 703 รายการ)
8. **Information Systems** (ข้อมูลสะอาด 702 รายการ)
9. **Signal Processing** (ข้อมูลสะอาด 702 รายการ)
10. **Software** (ข้อมูลสะอาด 700 รายการ)

*ทุกสาขาวิชามีจำนวนบทความเกินเกณฑ์ขั้นต่ำ 600 รายการตามข้อกำหนดของอาจารย์ผู้สอนอย่างครบถ้วน (รวมข้อมูลสะอาดทั้งสิ้น 6,991 รายการ จากข้อมูลดิบ 7,280 รายการ)*

---

## สคริปต์ประมวลผลข้อมูลหลัก (`scopus_eda_analysis.py`)

ในโครงงานนี้ได้จัดเตรียมสคริปต์ภาษา Python หลักสำหรับแสดงกระบวนการทำงานจริงตามโจทย์ของรายวิชา:
```bash
python scopus_eda_analysis.py
```
**ขั้นตอนการทำงานของสคริปต์:**
1. **การโหลดและตรวจสอบข้อมูลดิบ:** โหลดชุดข้อมูล 7,280 รายการจาก `data/scopus_10subjects_raw.csv` ตรวจสอบมิติและชนิดของคอลัมน์
2. **การขจัดข้อมูลซ้ำซ้อน (Deduplication):** ตรวจจับบทความที่ปรากฏซ้ำข้ามสาขาด้วยชื่อบทความ และคงไว้เพียงสาขาเดียว (ตัดออก 175–180 รายการ)
3. **การกรองข้อมูลที่ไม่เกี่ยวข้อง (Cleaning & Filtering):**
   - กรองบทความภาษาต่างประเทศที่ไม่ใช่ภาษาอังกฤษ (25 รายการ)
   - กรองบทความที่ไม่มีบทคัดย่อหรือบทคัดย่อสั้นกว่าเกณฑ์ (30 รายการ)
   - คัดแยกบทความนอกศาสตร์คอมพิวเตอร์ เช่น ดัชนีอสังหาริมทรัพย์ในดูไบ, การจัดการโรงแรม, รากฟันเทียม และผลผลิตข้าวสาลี (59–60 รายการ)
4. **การคำนวณสถิติเชิงพรรณนา:** คำนวณค่าเฉลี่ย มัธยฐาน และการกระจายตัวของ Citations และปีที่ตีพิมพ์
5. **การสร้างข้อความรวม (Text Concatenation):** รวม Title, Abstract, Author Keywords และ Index Keywords พร้อมแท็กระบุส่วน
6. **การสกัด Feature Vector และ L2 Normalization:** จำลองการสกัดเวกเตอร์มิติ 768 และปรับขนาดด้วย L2 Norm ($||v||_2 = 1.0$) พร้อมสำหรับงาน Machine Learning

---

## แพลตฟอร์มการแสดงผลด้วยภาพแบบโต้ตอบ (Interactive Visualizations)

แดชบอร์ดได้รับการออกแบบใหม่ทั้งหมดโดยประยุกต์ใช้เทคโนโลยี **Apache ECharts** พร้อมระบบ **Force-directed Physics Simulation** ป้องกันปัญหาตัวอักษรและโหนดซ้อนทับกันอย่างสิ้นเชิง ประกอบด้วย 6 มุมมองหลัก:
1. **🕸️ Interactive Knowledge Network:** กราฟเครือข่ายความสัมพันธ์คำสำคัญแบบฟิสิกส์แรงผลัก ขนาดโหนดแทน Document Frequency และความหนาของเส้นแทน Co-occurrence Weight แบ่งเป็น 5 Thematic Clusters พร้อมระบบคลิกโหนดเพื่อดูรายการบทความจริงในแถบด้านข้าง
2. **☁️ Dynamic Semantic Word Cloud:** คลาวด์คำสำคัญจัดวางแบบไร้การซ้อนทับ (Collision-free Layout) กรองดูแนวโน้มรายปี (2020–2026) และคลิกเพื่อนำคำสำคัญไปค้นหาในบทความได้ทันที
3. **🔥 Cross-Disciplinary Topic Overlap Heatmap:** แผนภูมิความร้อนแบบไล่ระดับสีต่อเนื่อง (Continuous Gradient) แสดงการกระจายตัวของเทคโนโลยีสำคัญ (เช่น Machine Learning, Cloud, Optimization) ข้ามทั้ง 10 สาขาวิชา
4. **📈 Strategic Topic Growth & Evolution Quadrant:** จตุภาคประเมินการเติบโตเชิงยุทธศาสตร์: คำนวณอัตราการเติบโตเชิงสัมพัทธ์ $log_2(Recent/Prior)$ เทียบกับปริมาณบทความจริง แบ่งออกเป็น 4 โซน: High-Volume Emerging, Core Established, Emerging Niche, และ Specialized Topics
5. **📊 EDA Descriptive Metrics:** แดชบอร์ดสรุปสถิติเชิงพรรณนา กราฟแท่งเปรียบเทียบข้อมูลดิบกับข้อมูลสะอาด และกราฟพื้นที่แนวโน้มปีที่ตีพิมพ์
6. **🔍 Scopus Literature Explorer:** ระบบค้นหาบทความวิจัย ค้นหาตามชื่อเรื่อง ผู้แต่ง หรือคำสำคัญ กรองตามสาขาวิชา และเรียงตามการอ้างอิง พร้อมหน้าต่าง Modal แสดงบทคัดย่อฉบับเต็มและลิงก์ DOI

---

## การเตรียมคุณลักษณะข้อความ (Feature Vector & Text Embedding)

1. **การรวมฟิลด์ข้อความ:** บูรณาการ Title, Abstract, Author Keywords และ Index Keywords โดยมีแท็กระบุนำหน้าชัดเจน
2. **ข้อจำกัดความยาวโทเค็น (512 Tokens):** รองรับโมเดลเฉพาะทางด้านวิทยาศาสตร์ SPECTER2 (`allenai/specter2_base` + proximity adapter) ซึ่งข้อมูลส่วนใหญ่มีความยาวเฉลี่ยประมาณ 160–318 โทเค็น
3. **L2 Normalization:** ปรับขนาดเวกเตอร์ 768 มิติ ให้มีความยาวเท่ากับ 1 หน่วย ช่วยให้การวัด Cosine Similarity ผ่าน Dot Product ทำได้อย่างรวดเร็ว
4. **Machine Learning Readiness:** ข้อมูลพร้อมนำไปประยุกต์ใช้งานในโจทย์ Subject Classification, Semantic Clustering (K-Means / HDBSCAN) และ Paper Recommendation

---

## โครงสร้างไฟล์ใน Repository

```text
├── data/
│   ├── scopus_10subjects_raw.csv         # ชุดข้อมูลดิบจาก Scopus (7,280 รายการ)
│   └── scopus_10subjects_cleaned.csv     # ชุดข้อมูลที่ผ่านการคลีนแล้ว (6,991 รายการ)
├── docs/                                 # เว็บไซต์ Interactive Visualization สำหรับ GitHub Pages
│   ├── index.html                        # แดชบอร์ดนำเสนอผลงานแบบโต้ตอบได้สมบูรณ์ (6 มุมมอง)
│   ├── css/style.css                     # สไตล์ชีทโมเดิร์น
│   ├── js/
│   │   ├── app.js                        # จาวาสคริปต์ควบคุมการทำงานและการวาดกราฟ ECharts
│   │   ├── echarts.min.js                # ไลบรารี Apache ECharts (ออฟไลน์ 100%)
│   │   └── echarts-wordcloud.min.js      # ปลั๊กอิน Word Cloud แบบไร้การซ้อนทับ
│   └── data/viz_data.json                # ข้อมูลสถิติและกราฟสำหรับหน้าเว็บ
├── report/
│   ├── EDA_Scopus_Report.docx            # รายงานวิชาการฉบับสมบูรณ์ (รูปแบบ Word ฟอนต์ TH Sarabun New)
│   ├── EDA_Scopus_Report.pdf             # รายงานวิชาการฉบับสมบูรณ์ (รูปแบบ PDF)
│   └── figures/                          # รูปภาพแผนภูมิความละเอียดสูงที่ใช้ในเล่มรายงาน
├── slides/
│   ├── EDA_Scopus_Presentation.pptx      # สไลด์นำเสนอ 16:9 สไตล์ Modern Minimal พร้อม Speaker Notes
│   └── EDA_Scopus_Presentation.pdf       # สไลด์นำเสนอรูปแบบ PDF
├── scopus_eda_analysis.py                # สคริปต์ Python หลักแสดงการทำงาน EDA & ML Pipeline
├── README.md                             # เอกสารแนะนำโครงงาน
└── .gitignore                            # การตั้งค่าคัดกรองไฟล์
```

---

## การประเมินคะแนน (20 คะแนน)
- **Visualization:** 5 คะแนน (ผ่านการส่งมอบเว็บแอพ Interactive ECharts Dashboard 6 มุมมอง)
- **Slide Presentation:** 5 คะแนน (ผ่านการส่งมอบไฟล์ PPTX และ PDF ดีไซน์ 16:9 มี Speaker Notes ครบถ้วน)
- **Report:** 10 คะแนน (ผ่านการส่งมอบเล่มรายงาน DOCX และ PDF ครบทั้ง 3 ส่วนตามข้อกำหนด)
