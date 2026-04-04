package models

import (
	"fmt"
	"syscall"
)

// checkDiskSpace verifies that the target directory has enough free space
// for the estimated model download. estimatedGB is the approximate size in gigabytes.
// Returns nil if sufficient space is available or the check cannot be performed.
func checkDiskSpace(path string, estimatedGB float64) error {
	if estimatedGB <= 0 {
		return nil
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs(path, &stat); err != nil {
		// Can't determine disk space — don't block the download
		return nil
	}

	availableBytes := stat.Bavail * uint64(stat.Bsize)
	requiredBytes := uint64(estimatedGB * 1.1 * 1e9) // 10% safety margin

	if availableBytes < requiredBytes {
		availGB := float64(availableBytes) / 1e9
		return fmt.Errorf("insufficient disk space: %.1f GB available, %.1f GB required for model download", availGB, estimatedGB)
	}

	return nil
}

// estimateModelSize looks up the approximate download size for a model from the catalog.
// Returns the VRAM estimate in GB (which closely matches Q4_K_M file size), or 0 if unknown.
func estimateModelSize(name string) float64 {
	catalog := GetCatalog()

	// Parse name:size format
	modelName, size := parseName(name)

	for _, m := range catalog {
		if m.Name == modelName {
			if vram, ok := m.VRAM[size]; ok {
				return vram
			}
		}
	}
	return 0
}

// parseName splits "model:size" into its components.
func parseName(name string) (string, string) {
	for i := len(name) - 1; i >= 0; i-- {
		if name[i] == ':' {
			return name[:i], name[i+1:]
		}
	}
	return name, ""
}
