//go:build darwin

package gateway

import "syscall"

func totalMemoryBytes() uint64 {
	val, err := syscall.Sysctl("hw.memsize")
	if err != nil {
		return 0
	}
	if len(val) == 0 {
		return 0
	}
	// hw.memsize returns a little-endian encoded uint64 as raw bytes
	var total uint64
	for i := 0; i < len(val) && i < 8; i++ {
		total |= uint64(val[i]) << (uint(i) * 8)
	}
	return total
}
