FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y openjdk-21-jre-headless \
  && rm -rf /var/lib/apt/lists/*

RUN npm i -g firebase-tools@latest

WORKDIR /workspace
CMD ["bash","-lc","firebase emulators:start --only auth,firestore,storage --project \"$FIREBASE_PROJECT_ID\" --host 0.0.0.0"]
