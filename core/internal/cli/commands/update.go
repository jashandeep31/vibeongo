package commands

import "fmt"

func UpdateCmd() {
	fmt.Println("Updating the vibeongo to next version")
	downloadUrl := "https://l1.devsradar.com/vibeongo"
	fmt.Println("our download url is", downloadUrl)
}
