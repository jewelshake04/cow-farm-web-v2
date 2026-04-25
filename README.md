# 🐄 গরুর খামার ম্যানেজমেন্ট - Web Version

## অনলাইনে Deploy করার নিয়ম (Railway.app - বিনামূল্যে)

### ধাপ ১: GitHub Account খুলুন
👉 https://github.com/signup - ফ্রি অ্যাকাউন্ট তৈরি করুন

### ধাপ ২: নতুন Repository তৈরি করুন
1. GitHub এ লগইন করুন
2. উপরে ডান কোণে "+" বাটনে ক্লিক করুন
3. "New repository" ক্লিক করুন
4. Repository name: `cow-farm-web`
5. Public নির্বাচন করুন
6. "Create repository" ক্লিক করুন

### ধাপ ৩: কোড আপলোড করুন
1. নতুন repository পেজে "uploading an existing file" ক্লিক করুন
2. এই ZIP এর সব ফাইল drag করে ছেড়ে দিন
3. "Commit changes" ক্লিক করুন

### ধাপ ৪: Railway.app এ Deploy করুন
1. 👉 https://railway.app যান
2. "Start a New Project" ক্লিক করুন
3. "Deploy from GitHub repo" ক্লিক করুন
4. GitHub account connect করুন
5. `cow-farm-web` repository নির্বাচন করুন
6. "Deploy Now" ক্লিক করুন

### ধাপ ৫: লিংক পাবেন!
- Deploy হলে Settings > Domains > "Generate Domain" ক্লিক করুন
- আপনি একটি লিংক পাবেন: `https://cow-farm-web-xxx.railway.app`
- এই লিংক যেকোনো ডিভাইস থেকে ব্যবহার করুন! 🎉

## লগইন তথ্য
- Username: admin
- Password: admin123

## Local এ চালানোর নিয়ম
```
npm install
npm start
```
তারপর: http://localhost:3000
