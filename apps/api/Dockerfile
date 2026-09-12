FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml ./
COPY src ./src
COPY tests ./tests
RUN pip install --no-cache-dir .

EXPOSE 8000
CMD ["uvicorn", "campus_sports.main:app", "--host", "0.0.0.0", "--port", "8000"]
