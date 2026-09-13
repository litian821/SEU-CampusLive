FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src
WORKDIR /app
COPY pyproject.toml ./
# Cache dependency installation independently of application source changes.
RUN python -c "import subprocess, tomllib; p=tomllib.load(open('pyproject.toml','rb')); subprocess.check_call(['pip','install','--no-cache-dir',*p['project']['dependencies']])"

FROM base AS test
RUN python -c "import subprocess, tomllib; p=tomllib.load(open('pyproject.toml','rb')); subprocess.check_call(['pip','install','--no-cache-dir',*p['project']['optional-dependencies']['dev']])"
COPY src ./src
COPY tests ./tests
CMD ["pytest"]

FROM base AS runtime
COPY src ./src
EXPOSE 8000
CMD ["uvicorn", "campus_sports.main:app", "--host", "0.0.0.0", "--port", "8000"]
