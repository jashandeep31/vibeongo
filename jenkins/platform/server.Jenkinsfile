pipeline {
    agent any

    environment {
        IMAGE = 'vibeongo_server'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/jashandeep31/vibeongo.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                dir('platform') {
                    sh '''
                        set -eu
                        : "${REGISTRY:?Set REGISTRY in the Jenkins job environment}"
                        docker build \
                            -t "$REGISTRY/$IMAGE:latest" \
                            -f apps/server/Dockerfile .
                    '''
                }
            }
        }

        stage('Login and Push') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker',
                        usernameVariable: 'REGISTRY_USERNAME',
                        passwordVariable: 'REGISTRY_PASSWORD'
                    )
                ]) {
                    sh '''
                        set +x
                        set -eu
                        DOCKER_CONFIG="$(mktemp -d)"
                        export DOCKER_CONFIG
                        trap 'rm -rf "$DOCKER_CONFIG"' EXIT

                        printf '%s' "$REGISTRY_PASSWORD" |
                            docker login "$REGISTRY" \
                                --username "$REGISTRY_USERNAME" \
                                --password-stdin

                        docker push "$REGISTRY/$IMAGE:latest"
                    '''
                }
            }
        }

        stage('Deploy VibeonGo') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'vibeongo-server-env',
                        variable: 'SERVER_ENV_CREDENTIAL_FILE'
                    ),
                    file(
                        credentialsId: 'vibeongo-github-app-pem',
                        variable: 'GITHUB_APP_PEM_CREDENTIAL_FILE'
                    )
                ]) {
                    sh '''
                        set +x
                        set -eu

                        IMAGE_NAME="$REGISTRY/$IMAGE:latest"

                        docker network inspect vibeongo-network >/dev/null 2>&1 ||
                            docker network create vibeongo-network

                        # Copy the PEM through Docker so it reaches the Docker host.
                        docker volume create vibeongo-pem >/dev/null
                        docker rm -f vibeongo-pem-stage >/dev/null 2>&1 || true
                        docker run -d \
                            --name vibeongo-pem-stage \
                            --mount type=volume,source=vibeongo-pem,target=/run/vibeongo-secrets \
                            "$IMAGE_NAME" sleep 3600 >/dev/null
                        trap 'docker rm -f vibeongo-pem-stage >/dev/null 2>&1 || true' EXIT
                        docker cp "$GITHUB_APP_PEM_CREDENTIAL_FILE" \
                            vibeongo-pem-stage:/run/vibeongo-secrets/vibeongo.pem
                        docker exec vibeongo-pem-stage sh -c \
                            'chmod 600 /run/vibeongo-secrets/vibeongo.pem && test -s /run/vibeongo-secrets/vibeongo.pem'
                        docker rm -f vibeongo-pem-stage >/dev/null
                        trap - EXIT

                        docker rm -f vibeongo vibeongo-cron \
                            vibeongo-server vibeongo-worker 2>/dev/null || true

                        docker run -d \
                            --name vibeongo-server \
                            --restart unless-stopped \
                            --network vibeongo-network \
                            --env-file "$SERVER_ENV_CREDENTIAL_FILE" \
                            -e PORT=8000 \
                            -e GITHUB_APP_PRIVATE_KEY_PATH=/run/vibeongo-secrets/vibeongo.pem \
                            --mount type=volume,source=vibeongo-pem,target=/run/vibeongo-secrets,readonly \
                            -p 8000:8000 \
                            "$IMAGE_NAME" \
                            node dist/index.js

                        docker run -d \
                            --name vibeongo-worker \
                            --restart unless-stopped \
                            --network vibeongo-network \
                            --env-file "$SERVER_ENV_CREDENTIAL_FILE" \
                            -e GITHUB_APP_PRIVATE_KEY_PATH=/run/vibeongo-secrets/vibeongo.pem \
                            --mount type=volume,source=vibeongo-pem,target=/run/vibeongo-secrets,readonly \
                            "$IMAGE_NAME" \
                            node dist/cron-worker.js

                        docker ps --filter name=vibeongo-
                    '''
                }
            }
        }
    }
}
