add_library(mantisbase_admin STATIC "")

# Collect all admin dashboard static files
file(GLOB_RECURSE ADMIN_STATIC_FILES LIST_DIRECTORIES false "${CMAKE_CURRENT_SOURCE_DIR}/public/*")

# Collect any asset files
file(GLOB_RECURSE MANTIS_ASSET_FILES LIST_DIRECTORIES false "${CMAKE_CURRENT_SOURCE_DIR}/assets/*")

# Create CMRC resource library with embedded files
cmrc_add_resource_library(mb-rc NAMESPACE mantis ${ADMIN_STATIC_FILES} ${MANTIS_ASSET_FILES} "favicon.ico")

# Link resources to admin library - use PUBLIC to expose to downstream targets
target_link_libraries(mantisbase_admin PUBLIC mb-rc)

# Make CMRC headers available to any target linking to mantisbase_admin
target_compile_definitions(mantisbase_admin PUBLIC CMRC_ENABLE)

# Export the library for downstream consumption
set_target_properties(mantisbase_admin PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "$<INSTALL_INTERFACE:include>"
)
