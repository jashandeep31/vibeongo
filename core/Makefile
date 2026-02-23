
hello:
	echo "Hello MakeFile is working brotheeerrr"


api: 
	go build -o api ./cmd/api-server


bootstrap: 
	go build -o bootstrap-script ./cmd/bootstrap

deploy:
	scp ./bootstrap-script  ironman@192.168.1.11:/home/ironman
