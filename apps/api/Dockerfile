FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml ./
COPY src ./src
COPY tests ./tests

FROM base AS test
RUN pip install --no-cache-dir ".[dev]"
CMD ["pytest"]

FROM base AS runtime
RUN pip install --no-cache-dir .

EXPOSE 8000
CMD ["uvicorn", "campus_sports.main:app", "--host", "0.0.0.0", "--port", "8000"]
