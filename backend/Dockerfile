# Aitbaar backend — FastAPI + AI engine (XGBoost/SHAP/Gemini-via-OpenRouter).
# Railway: create a service with root directory backend/, set OPENROUTER_API_KEY.

FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY data ./data
COPY models ./models

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
