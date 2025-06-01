FROM python:3.13

ENV TZ=America/Sao_Paulo

WORKDIR /app

COPY . /app

RUN pip3 install --trusted-host pypi.python.org -r requirements.txt

CMD [ "python","run.py"]