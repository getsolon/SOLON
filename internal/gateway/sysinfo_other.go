//go:build !darwin && !linux

package gateway

func totalMemoryBytes() uint64 {
	return 0
}
