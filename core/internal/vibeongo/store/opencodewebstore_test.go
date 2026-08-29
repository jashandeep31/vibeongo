package store

import "testing"

func TestValidateOpencodePassword(t *testing.T) {
	tests := []struct {
		name      string
		password  string
		wantError bool
	}{
		{name: "missing", password: "", wantError: true},
		{name: "blank", password: "   ", wantError: true},
		{name: "present", password: "instance-password", wantError: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateOpencodePassword(test.password)
			if (err != nil) != test.wantError {
				t.Fatalf("validateOpencodePassword() error = %v, wantError %v", err, test.wantError)
			}
		})
	}
}
